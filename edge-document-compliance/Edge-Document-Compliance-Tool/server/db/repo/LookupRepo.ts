import { Pool } from "pg";

export class LookupRepo {
  constructor(private pool: Pool) {}

  async findStandardPacksLike(term: string) {
    const sql = `
      select p.id as pack_id, s.authority, s.reg_id, s.label, p.version, p.created_at
      from edcat.reg_packs p
      join edcat.reg_sources s on s.id=p.source_id
      where s.label ilike $1 or s.reg_id ilike $1
      order by p.created_at desc`;
    return this.pool.query(sql, [`%${term}%`]);
  }

  async findStandardSourcesLike(term: string) {
    const sql = `
      select id as source_id, authority, reg_id, label, url
      from edcat.reg_sources
      where label ilike $1 or reg_id ilike $1`;
    return this.pool.query(sql, [`%${term}%`]);
  }

  async findUploadsLike(term: string) {
    const sql = `
      select id, filename, mimetype, size_bytes, created_at
      from edcat.uploaded_files
      where filename ilike $1`;
    return this.pool.query(sql, [`%${term}%`]);
  }

  async listAllStandards(limit=50) {
    const sql = `
      select distinct s.authority, s.reg_id, s.label,
             (select max(created_at) from edcat.reg_packs p where p.source_id=s.id) as last_ingested
      from edcat.reg_sources s
      order by s.label asc
      limit $1`;
    return this.pool.query(sql, [limit]);
  }

  async listUploads(limit=50) {
    return this.pool.query(`
      select id, filename, mimetype, size_bytes, created_at
      from edcat.uploaded_files
      order by created_at desc
      limit $1`, [limit]);
  }
}

