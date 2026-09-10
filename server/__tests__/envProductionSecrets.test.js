const fs = require('fs');
const path = require('path');

// server/.env.production was committed with a live MongoDB Atlas connection
// string, JWT_SECRET, and SESSION_SECRET (see BACKLOG.md). This suite pins
// down the repo-hygiene half of the fix: the file can never be re-committed,
// and its place is taken by a secret-free example teammates can copy.
describe('server/.env.production secrets hygiene', () => {
  const repoRoot = path.join(__dirname, '..', '..');
  const gitignorePath = path.join(repoRoot, '.gitignore');
  const productionEnvPath = path.join(repoRoot, 'server', '.env.production');
  const productionExamplePath = path.join(
    repoRoot,
    'server',
    '.env.production.example'
  );

  it('is gitignored so it can never be committed again', () => {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    expect(gitignore).toMatch(/(^|\n)server\/\.env\.production(\n|$)/);
  });

  it('no longer exists in the working tree', () => {
    expect(fs.existsSync(productionEnvPath)).toBe(false);
  });

  it('is documented via a secret-free .env.production.example instead', () => {
    expect(fs.existsSync(productionExamplePath)).toBe(true);
    const example = fs.readFileSync(productionExamplePath, 'utf8');

    // None of the real secrets that used to live in this file.
    expect(example).not.toContain('tennisschedulejcc');
    expect(example).not.toContain('btSBKEeKafPB7OWB');
    expect(example).not.toContain('cluster0.tcpmg.mongodb.net');
    expect(example).not.toContain(
      'e0e6f43d17e1de97f11d9e605e0409f24af5b03b9040a67b53b54276489c10a1'
    );
    expect(example).not.toContain(
      'e9adf5a89beca640607c8e8a64d9fd2a4dce16b84100137b17c476f15a1810bc'
    );

    // Still documents every var server.ts actually reads for production.
    for (const key of [
      'MONGO_URI',
      'JWT_SECRET',
      'SESSION_SECRET',
      'CORS_ORIGIN',
      'NODE_ENV'
    ]) {
      expect(example).toContain(`${key}=`);
    }
  });
});
