import 'reflect-metadata';
import { validate } from 'class-validator';
import { 
  SideCharacterDto, 
  HeroDto, 
  CharacterRequestDto, 
  GenerateStoryDto, 
  PreviewLineDto 
} from './generation.dto';

describe('Generation DTOs', () => {
  describe('SideCharacterDto', () => {
    it('should pass validation with valid name and role', async () => {
      const dto = new SideCharacterDto();
      dto.name = 'Luna';
      dto.role = 'best friend';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with missing name', async () => {
      const dto = new SideCharacterDto();
      dto.role = 'friend';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find(e => e.property === 'name');
      expect(nameError).toBeDefined();
      expect(nameError?.constraints).toHaveProperty('isString');
    });

    it('should fail validation with missing role', async () => {
      const dto = new SideCharacterDto();
      dto.name = 'Luna';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const roleError = errors.find(e => e.property === 'role');
      expect(roleError).toBeDefined();
      expect(roleError?.constraints).toHaveProperty('isString');
    });
  });

  describe('HeroDto', () => {
    it('should pass validation with name only', async () => {
      const dto = new HeroDto();
      dto.name = 'Max';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with name and age', async () => {
      const dto = new HeroDto();
      dto.name = 'Anna';
      dto.age = '7';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with missing name', async () => {
      const dto = new HeroDto();
      dto.age = '5';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find(e => e.property === 'name');
      expect(nameError).toBeDefined();
      expect(nameError?.constraints).toHaveProperty('isString');
    });
  });

  describe('CharacterRequestDto', () => {
    it('should pass validation with no fields (all optional)', async () => {
      const dto = new CharacterRequestDto();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with valid hero', async () => {
      const heroDto = new HeroDto();
      heroDto.name = 'Tom';
      heroDto.age = '6';
      
      const dto = new CharacterRequestDto();
      dto.hero = heroDto;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with valid side characters', async () => {
      const sideChar1 = new SideCharacterDto();
      sideChar1.name = 'Luna';
      sideChar1.role = 'friend';
      
      const sideChar2 = new SideCharacterDto();
      sideChar2.name = 'Captain';
      sideChar2.role = 'pirate';
      
      const dto = new CharacterRequestDto();
      dto.sideCharacters = [sideChar1, sideChar2];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with both hero and side characters', async () => {
      const heroDto = new HeroDto();
      heroDto.name = 'Max';
      
      const sideCharDto = new SideCharacterDto();
      sideCharDto.name = 'Buddy';
      sideCharDto.role = 'dog';
      
      const dto = new CharacterRequestDto();
      dto.hero = heroDto;
      dto.sideCharacters = [sideCharDto];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('GenerateStoryDto', () => {
    it('should pass validation with prompt only', async () => {
      const dto = new GenerateStoryDto();
      dto.prompt = 'A story about a brave knight';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with all fields', async () => {
      const heroDto = new HeroDto();
      heroDto.name = 'Alex';
      heroDto.age = '8';
      
      const sideCharDto = new SideCharacterDto();
      sideCharDto.name = 'Robot';
      sideCharDto.role = 'helper';
      
      const charactersDto = new CharacterRequestDto();
      charactersDto.hero = heroDto;
      charactersDto.sideCharacters = [sideCharDto];
      
      const dto = new GenerateStoryDto();
      dto.prompt = 'Adventure in space';
      dto.age = '6-9';
      dto.characters = charactersDto;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with missing prompt', async () => {
      const dto = new GenerateStoryDto();
      dto.age = '3-5';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const promptError = errors.find(e => e.property === 'prompt');
      expect(promptError).toBeDefined();
      expect(promptError?.constraints).toHaveProperty('isString');
    });

    it('should fail validation with invalid prompt type', async () => {
      const dto = new GenerateStoryDto();
      (dto as any).prompt = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const promptError = errors.find(e => e.property === 'prompt');
      expect(promptError).toBeDefined();
      expect(promptError?.constraints).toHaveProperty('isString');
    });
  });

  describe('PreviewLineDto', () => {
    it('should pass validation with required fields', async () => {
      const dto = new PreviewLineDto();
      dto.text = 'Hello world!';
      dto.voiceId = 'voice_123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with all fields', async () => {
      const dto = new PreviewLineDto();
      dto.text = 'Hello world!';
      dto.voiceId = 'voice_123';
      dto.voiceSettings = {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true
      };
      dto.previous_text = 'Previous line';
      dto.next_text = 'Next line';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with missing text', async () => {
      const dto = new PreviewLineDto();
      dto.voiceId = 'voice_123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const textError = errors.find(e => e.property === 'text');
      expect(textError).toBeDefined();
      expect(textError?.constraints).toHaveProperty('isString');
    });

    it('should fail validation with missing voiceId', async () => {
      const dto = new PreviewLineDto();
      dto.text = 'Hello world!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const voiceIdError = errors.find(e => e.property === 'voiceId');
      expect(voiceIdError).toBeDefined();
      expect(voiceIdError?.constraints).toHaveProperty('isString');
    });

    it('should fail validation with invalid types', async () => {
      const dto = new PreviewLineDto();
      (dto as any).text = 123;
      (dto as any).voiceId = [];
      (dto as any).previous_text = true;
      (dto as any).next_text = {};

      const errors = await validate(dto);
      expect(errors.length).toBe(4);

      const textError = errors.find(e => e.property === 'text');
      expect(textError?.constraints).toHaveProperty('isString');

      const voiceIdError = errors.find(e => e.property === 'voiceId');
      expect(voiceIdError?.constraints).toHaveProperty('isString');

      const prevTextError = errors.find(e => e.property === 'previous_text');
      expect(prevTextError?.constraints).toHaveProperty('isString');

      const nextTextError = errors.find(e => e.property === 'next_text');
      expect(nextTextError?.constraints).toHaveProperty('isString');
    });
  });
});