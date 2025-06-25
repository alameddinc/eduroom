const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CodeExecutor {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  async execute(code, language, stdin = '') {
    const fileId = uuidv4();
    const config = this.getLanguageConfig(language);
    
    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const filePath = path.join(this.tempDir, `${fileId}${config.extension}`);
    
    try {
      // Ensure code doesn't have only empty lines or incorrect indentation
      const cleanedCode = code.trim();
      if (!cleanedCode) {
        throw new Error('Kod boş olamaz');
      }
      
      await fs.writeFile(filePath, code);
      
      const command = config.getCommand(filePath, stdin);
      
      return new Promise((resolve, reject) => {
        const child = exec(command, {
          timeout: 10000,
          maxBuffer: 1024 * 1024,
          cwd: this.tempDir
        }, (error, stdout, stderr) => {
          fs.unlink(filePath).catch(() => {});
          
          if (error) {
            if (error.killed) {
              reject({ message: 'Kod çalıştırma zaman aşımına uğradı (10 saniye)', details: 'Timeout' });
            } else if (stderr) {
              reject({ 
                message: 'Hata', 
                details: stderr 
              });
            } else {
              reject({ 
                message: 'Çalıştırma hatası', 
                details: error.message 
              });
            }
          } else {
            resolve({
              stdout: stdout || '',
              stderr: stderr || '',
              exitCode: 0
            });
          }
        });

        if (stdin) {
          child.stdin.write(stdin);
          child.stdin.end();
        }
      });
    } catch (error) {
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }
  }

  async runTests(code, language, testCases) {
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const result = await this.execute(code, language, testCase.input);
        const passed = result.stdout.trim() === testCase.expectedOutput.trim();
        
        results.push({
          ...testCase,
          actual: result.stdout,
          passed,
          error: result.stderr
        });
      } catch (error) {
        results.push({
          ...testCase,
          actual: '',
          passed: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  getLanguageConfig(language) {
    const configs = {
      python: {
        extension: '.py',
        getCommand: (filePath) => `python3 "${filePath}"`
      },
      go: {
        extension: '.go',
        getCommand: (filePath) => `go run "${filePath}"`
      },
      sql: {
        extension: '.sql',
        getCommand: (filePath) => `sqlite3 :memory: < "${filePath}"`
      },
      javascript: {
        extension: '.js',
        getCommand: (filePath) => `node "${filePath}"`
      }
    };

    return configs[language];
  }
}

module.exports = new CodeExecutor();