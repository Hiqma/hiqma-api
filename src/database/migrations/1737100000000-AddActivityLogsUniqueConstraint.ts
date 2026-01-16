import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityLogsUniqueConstraint1737100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, remove existing duplicates
    // Priority: Keep records with studentId > without studentId, then moduleCompleted=true > false, then oldest
    console.log('Removing duplicate activity logs...');
    
    const duplicatesQuery = `
      DELETE FROM activity_logs
      WHERE id IN (
        SELECT id
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY "hubId", "sessionId", "contentId", "timeSpent"
                   ORDER BY 
                     CASE WHEN "studentId" IS NOT NULL THEN 0 ELSE 1 END,
                     "moduleCompleted" DESC, 
                     timestamp ASC
                 ) as row_num
          FROM activity_logs
        ) t
        WHERE row_num > 1
      )
    `;
    
    const result = await queryRunner.query(duplicatesQuery);
    console.log(`Removed ${result[1] || 0} duplicate activity logs`);

    // Add unique constraint on session + content + time only
    // This ensures one record per unique reading event
    console.log('Adding unique constraint...');
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_activity_logs_unique" 
      ON activity_logs (
        "hubId", 
        "sessionId", 
        "contentId", 
        "timeSpent"
      )
    `);
    
    console.log('Unique constraint added successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Removing unique constraint...');
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_logs_unique"`);
    console.log('Unique constraint removed');
  }
}
