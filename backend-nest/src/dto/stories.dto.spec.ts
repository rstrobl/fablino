import { validate } from 'class-validator';
import { ToggleFeaturedDto, VoiceSwapDto } from './stories.dto';

describe('Stories DTOs', () => {
  describe('ToggleFeaturedDto', () => {
    it('should pass validation with valid boolean featured field', async () => {
      const dto = new ToggleFeaturedDto();
      dto.featured = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with false featured field', async () => {
      const dto = new ToggleFeaturedDto();
      dto.featured = false;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with non-boolean featured field', async () => {
      const dto = new ToggleFeaturedDto();
      (dto as any).featured = 'true'; // string instead of boolean

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('featured');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('should fail validation with missing featured field', async () => {
      const dto = new ToggleFeaturedDto();
      // featured field is not set

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('featured');
    });
  });

  describe('VoiceSwapDto', () => {
    it('should pass validation with valid character and voiceId', async () => {
      const dto = new VoiceSwapDto();
      dto.character = 'Hero';
      dto.voiceId = 'voice_123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with missing character', async () => {
      const dto = new VoiceSwapDto();
      dto.voiceId = 'voice_123';
      // character is missing

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const characterError = errors.find(e => e.property === 'character');
      expect(characterError).toBeDefined();
      expect(characterError?.constraints).toHaveProperty('isString');
    });

    it('should fail validation with missing voiceId', async () => {
      const dto = new VoiceSwapDto();
      dto.character = 'Hero';
      // voiceId is missing

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const voiceIdError = errors.find(e => e.property === 'voiceId');
      expect(voiceIdError).toBeDefined();
      expect(voiceIdError?.constraints).toHaveProperty('isString');
    });

    it('should fail validation with non-string character', async () => {
      const dto = new VoiceSwapDto();
      (dto as any).character = 123;
      dto.voiceId = 'voice_123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const characterError = errors.find(e => e.property === 'character');
      expect(characterError).toBeDefined();
      expect(characterError?.constraints).toHaveProperty('isString');
    });

    it('should fail validation with non-string voiceId', async () => {
      const dto = new VoiceSwapDto();
      dto.character = 'Hero';
      (dto as any).voiceId = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const voiceIdError = errors.find(e => e.property === 'voiceId');
      expect(voiceIdError).toBeDefined();
      expect(voiceIdError?.constraints).toHaveProperty('isString');
    });

    it('should pass validation with empty strings', async () => {
      const dto = new VoiceSwapDto();
      dto.character = '';
      dto.voiceId = '';

      const errors = await validate(dto);
      // Empty strings are valid according to @IsString() decorator
      expect(errors.length).toBe(0);
    });
  });
});