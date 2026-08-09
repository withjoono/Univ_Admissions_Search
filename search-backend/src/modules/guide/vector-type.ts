/**
 * pgvector가 어느 스키마에 설치돼 있는지 런타임에 1회 조회한다.
 *
 * 이 인스턴스는 vector 확장이 `infocast` 스키마에 설치돼 있고(init 마이그레이션도
 * `infocast.vector(768)`로 참조), 앱 커넥션의 search_path는 `search`뿐이다.
 * 따라서 raw SQL에서 타입(`::vector`)도 연산자(`<=>`)도 이름만으로는 해석되지 않는다:
 *   - 타입   → `type "vector" does not exist`
 *   - 연산자 → `operator does not exist: infocast.vector <=> infocast.vector`
 * 환경마다 설치 스키마가 다를 수 있으므로 하드코딩 대신 조회해서 스키마 한정 이름을 만든다.
 */
type RawClient = { $queryRawUnsafe<T = unknown>(sql: string, ...args: any[]): Promise<T> };

let cachedSchema: string | null = null;

async function vectorSchema(prisma: RawClient): Promise<string> {
  if (cachedSchema) return cachedSchema;
  const rows = await prisma.$queryRawUnsafe<{ ns: string }[]>(
    `SELECT n.nspname AS ns
       FROM pg_extension e
       JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'vector'`,
  );
  const ns = rows?.[0]?.ns;
  if (!ns) throw new Error('pgvector 확장이 설치돼 있지 않습니다 (CREATE EXTENSION vector).');
  cachedSchema = `"${ns}"`;
  return cachedSchema;
}

/** 캐스팅용 타입 이름. 예: `"infocast".vector` */
export async function resolveVectorType(prisma: RawClient): Promise<string> {
  return `${await vectorSchema(prisma)}.vector`;
}

/**
 * 코사인 거리 연산자의 스키마 한정 표기. 예: `OPERATOR("infocast".<=>)`
 * 한정해서 써도 같은 연산자이므로 HNSW(vector_cosine_ops) 인덱스는 그대로 쓰인다.
 */
export async function resolveCosineOp(prisma: RawClient): Promise<string> {
  return `OPERATOR(${await vectorSchema(prisma)}.<=>)`;
}
