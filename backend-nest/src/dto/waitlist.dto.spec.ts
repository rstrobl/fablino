import { validate } from 'class-validator';
import { CreateWaitlistDto } from './waitlist.dto';

describe('CreateWaitlistDto', () => {
  it('should pass validation with valid email only', async () => {
    const dto = new CreateWaitlistDto();
    dto.email = 'test@example.com';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with all fields', async () => {
    const dto = new CreateWaitlistDto();
    dto.email = 'test@example.com';
    dto.heroName = 'Max';
    dto.heroAge = '7';
    dto.prompt = 'A story about adventure';
    dto.sideCharacters = [{ name: 'Luna', role: 'friend' }];
    dto.storyId = 'story_123';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid email format', async () => {
    const dto = new CreateWaitlistDto();
    dto.email = 'invalid-email';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail validation with missing email', async () => {
    const dto = new CreateWaitlistDto();
    // email is missing

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const emailError = errors.find(e => e.property === 'email');
    expect(emailError).toBeDefined();
    expect(emailError?.constraints).toHaveProperty('isEmail');
  });

  it('should fail validation with non-string optional fields', async () => {
    const dto = new CreateWaitlistDto();
    dto.email = 'test@example.com';
    (dto as any).heroName = 123;
    (dto as any).heroAge = true;
    (dto as any).prompt = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const heroNameError = errors.find(e => e.property === 'heroName');
    expect(heroNameError).toBeDefined();
    expect(heroNameError?.constraints).toHaveProperty('isString');

    const heroAgeError = errors.find(e => e.property === 'heroAge');
    expect(heroAgeError).toBeDefined();
    expect(heroAgeError?.constraints).toHaveProperty('isString');

    const promptError = errors.find(e => e.property === 'prompt');
    expect(promptError).toBeDefined();
    expect(promptError?.constraints).toHaveProperty('isString');
  });

  it('should pass validation with empty strings for optional fields', async () => {
    const dto = new CreateWaitlistDto();
    dto.email = 'test@example.com';
    dto.heroName = '';
    dto.heroAge = '';
    dto.prompt = '';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept various email formats', async () => {
    const validEmails = [
      'user@domain.com',
      'user.name@domain.co.uk',
      'user+tag@domain.org',
      'user123@123domain.com',
    ];

    for (const email of validEmails) {
      const dto = new CreateWaitlistDto();
      dto.email = email;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should reject invalid email formats', async () => {
    const invalidEmails = [
      'plainaddress',
      '@domain.com',
      'user@',
      'user..name@domain.com',
      'user@domain',
      '',
    ];

    for (const email of invalidEmails) {
      const dto = new CreateWaitlistDto();
      dto.email = email;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    }
  });
});