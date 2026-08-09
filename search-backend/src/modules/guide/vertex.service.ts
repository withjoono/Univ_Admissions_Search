import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

/**
 * Vertex AI 래퍼 (임베딩 + Gemini 생성).
 *
 * 프롬프트 캐싱:
 *  - 안정적인 시스템 지시(정책·용어·면책)를 Vertex Context Cache로 1회 생성해 재사용한다.
 *    → 매 질의마다 같은 시스템 프롬프트를 다시 입력 토큰으로 과금하지 않음(캐시 입력 단가 ≈ 1/10).
 *  - Gemini 2.5 Flash는 이에 더해 반복 prefix에 대한 implicit caching도 자동 적용된다.
 */
@Injectable()
export class VertexService {
  private readonly log = new Logger(VertexService.name);
  private ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  });
  private readonly genModel = process.env.GUIDE_GEN_MODEL || 'gemini-2.5-flash';
  private readonly embedModel = 'gemini-embedding-001';
  private readonly dim = 768;

  private cacheName: string | null = null;
  private cacheExpiresAt = 0;
  private readonly cacheTtlSec = 3600;

  // 캐시에 태울 안정적 시스템 지시 (질의와 무관하게 고정)
  private readonly systemInstruction = [
    '너는 대한민국 대학 입시(수시) 상담을 돕는 어시스턴트다.',
    '반드시 아래 원칙을 지켜라:',
    '1) 제공된 <자료> 안에 있는 내용만 근거로 사용하고, 없는 사실은 지어내지 않는다.',
    '2) 답변 끝에 사용한 근거의 출처(문서명·페이지)를 표기한다.',
    '3) 합격 가능성·경쟁률·입결은 모두 추정치이며 보장이 아님을 명확히 밝힌다.',
    '4) 전형명·모집인원·전형방법 등 수치·고유명사는 자료의 표기를 그대로 인용한다.',
    '5) 자료로 답할 수 없으면 모른다고 말하고 추측하지 않는다.',
    '6) 한국어로, 학생·학부모가 이해하기 쉽게 간결히 답한다.',
  ].join('\n');

  /** 질의 임베딩(검색용). */
  async embedQuery(text: string): Promise<number[]> {
    const res = await this.ai.models.embedContent({
      model: this.embedModel,
      contents: [text],
      config: { outputDimensionality: this.dim, taskType: 'RETRIEVAL_QUERY' },
    });
    return (res.embeddings?.[0]?.values as number[]) ?? [];
  }

  /** 시스템 지시 컨텍스트 캐시를 확보(만료 시 재생성). 실패 시 null → 인라인 폴백. */
  private async ensureSystemCache(): Promise<string | null> {
    const now = Date.now();
    if (this.cacheName && now < this.cacheExpiresAt) return this.cacheName;
    try {
      const cache = await this.ai.caches.create({
        model: this.genModel,
        config: {
          systemInstruction: this.systemInstruction,
          ttl: `${this.cacheTtlSec}s`,
          displayName: 'guide-rag-system',
        },
      });
      this.cacheName = cache.name ?? null;
      this.cacheExpiresAt = now + (this.cacheTtlSec - 120) * 1000;
      this.log.log(`context cache 생성: ${this.cacheName}`);
      return this.cacheName;
    } catch (e) {
      // 캐시 최소 토큰 미달 등 → 캐시 없이 진행(implicit caching은 여전히 동작)
      this.log.warn(`context cache 생략(폴백): ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * 근거 기반 답변 생성.
   * @param question 사용자 질문
   * @param contexts 검색된 근거 청크 [{ref, text}]
   * @param profile  (선택) Hub 입시 프로파일 요약
   */
  async answerGrounded(
    question: string,
    contexts: { ref: string; text: string }[],
    profile?: string,
  ): Promise<string> {
    const cacheName = await this.ensureSystemCache();
    const evidence = contexts.map((c, i) => `[근거 ${i + 1} | ${c.ref}]\n${c.text}`).join('\n\n');
    const userBlock =
      (profile ? `<학생 프로파일>\n${profile}\n\n` : '') +
      `<자료>\n${evidence}\n\n<질문>\n${question}`;

    // gemini-2.5-flash는 thinking이 기본 활성이고 thinking 토큰이 maxOutputTokens를 함께 소모한다.
    // 근거 기반 요약 답변에는 추론이 불필요하므로 꺼서 본문이 잘리지 않게 한다(비용·지연도 감소).
    const config: any = {
      temperature: 0.2,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    };
    if (cacheName) config.cachedContent = cacheName;
    else config.systemInstruction = this.systemInstruction; // 폴백

    const res = await this.ai.models.generateContent({
      model: this.genModel,
      contents: [{ role: 'user', parts: [{ text: userBlock }] }],
      config,
    });
    return res.text ?? '';
  }
}
