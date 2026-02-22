import { validate } from 'class-validator';
import { ReserveDto } from './reserve.dto';

describe('ReserveDto', () => {
  it('should pass validation with no fields (all optional)', async () => {
    const dto = new ReserveDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with all fields', async () => {
    const dto = new ReserveDto();
    dto.heroName = 'Anna';
    dto.heroAge = '5';
    dto.prompt = 'A magical adventure in the forest';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with some fields', async () => {
    const dto = new ReserveDto();
    dto.heroName = 'Tom';
    dto.prompt = 'A space adventure';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with non-string heroName', async () => {
    const dto = new ReserveDto();
    (dto as any).heroName = 123;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('heroName');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should fail validation with non-string heroAge', async () => {
    const dto = new ReserveDto();
    (dto as any).heroAge = 7; // number instead of string

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('heroAge');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should fail validation with non-string prompt', async () => {
    const dto = new ReserveDto();
    (dto as any).prompt = true; // boolean instead of string

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('prompt');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should pass validation with empty strings', async () => {
    const dto = new ReserveDto();
    dto.heroName = '';
    dto.heroAge = '';
    dto.prompt = '';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with multiple invalid types', async () => {
    const dto = new ReserveDto();
    (dto as any).heroName = [];
    (dto as any).heroAge = {};
    (dto as any).prompt = 123; // Use number instead of null (null is valid for optional fields)

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
});