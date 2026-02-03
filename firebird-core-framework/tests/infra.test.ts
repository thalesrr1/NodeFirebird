import { describe, expect, it } from '@jest/globals';

// Importa o package.json
import packageJson from '../package.json';

describe('Infra Test Suite', () => {
  it('should verify project name is correct', () => {
    expect(packageJson.name).toBe('@thalesrr1/firebird-core-framework');
  });
});