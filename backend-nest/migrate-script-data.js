const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fablino:fablino123@127.0.0.1:5433/fablino'
    }
  }
});

async function migrateScriptData() {
  console.log('Starting migration of script_data to new columns...');

  try {
    // Get all stories with script_data
    const stories = await prisma.$queryRaw`
      SELECT id, script_data 
      FROM stories 
      WHERE script_data IS NOT NULL 
      AND script_data != 'null'::jsonb
    `;

    console.log(`Found ${stories.length} stories with script_data to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const story of stories) {
      try {
        const scriptData = story.script_data;
        
        // Extract fields from script_data
        const voiceMap = scriptData?.voiceMap || null;
        const scriptConfirmed = scriptData?.scriptConfirmed || false;
        const generationState = scriptData?.generationState || null;
        const pipelineSteps = scriptData?.pipeline || null; // Note: using 'pipeline' from script_data
        const userCharacters = scriptData?.userCharacters || null;

        console.log(`Migrating story ${story.id}:`);
        console.log(`  - voiceMap: ${voiceMap ? 'found' : 'null'}`);
        console.log(`  - scriptConfirmed: ${scriptConfirmed}`);
        console.log(`  - generationState: ${generationState ? 'found' : 'null'}`);
        console.log(`  - pipelineSteps: ${pipelineSteps ? 'found' : 'null'}`);
        console.log(`  - userCharacters: ${userCharacters ? 'found' : 'null'}`);

        // Update the story with extracted data
        await prisma.$queryRaw`
          UPDATE stories 
          SET 
            voice_map = ${JSON.stringify(voiceMap)}::jsonb,
            script_confirmed = ${scriptConfirmed},
            generation_state = ${JSON.stringify(generationState)}::jsonb,
            pipeline_steps = ${JSON.stringify(pipelineSteps)}::jsonb,
            user_characters = ${JSON.stringify(userCharacters)}::jsonb
          WHERE id = ${story.id}::uuid
        `;

        migratedCount++;
        console.log(`  ✓ Migrated successfully\n`);

      } catch (error) {
        console.error(`  ✗ Error migrating story ${story.id}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`Migration completed:`);
    console.log(`  - Successfully migrated: ${migratedCount} stories`);
    console.log(`  - Skipped due to errors: ${skippedCount} stories`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateScriptData()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });