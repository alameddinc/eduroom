export const codeTemplates = {
  python: `# Python örnek kod
def main():
    print("Merhaba Dünya!")

if __name__ == "__main__":
    main()`,

  go: `package main

import "fmt"

func main() {
    fmt.Println("Merhaba Dünya!")
}`,

  sql: `-- SQL örnek sorgu
SELECT 'Merhaba Dünya!' AS mesaj;`,

  javascript: `// JavaScript örnek kod
function main() {
    console.log("Merhaba Dünya!");
}

main();`
};

export const getDefaultCode = (language) => {
  return codeTemplates[language] || '';
};