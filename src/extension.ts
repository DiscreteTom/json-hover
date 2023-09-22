import * as vscode from "vscode";
import { Lexer } from "retsac";

const debug = process.env.VSCODE_DEBUG_MODE === "true";

const lexer = new Lexer.Builder()
  .ignore(Lexer.whitespaces) // ignore blank characters
  .define({
    string: Lexer.stringLiteral(`"`), // double quote string literal
    number: /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/,
  })
  .define(Lexer.wordType("true", "false", "null")) // type's name is the literal value
  .anonymous(Lexer.exact(..."[]{},:")) // single char borders
  .build({ debug });

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("json", {
      provideHover(document, position, token) {
        const text = document.getText();
        const offset = document.offsetAt(position);

        if (debug) {
          console.log(`offset: ${offset}`);
        }

        lexer.reset().feed(text);

        // perf: jump to the start of the target line, instead of lexing the whole file
        const lineStartOffset = document.offsetAt(
          new vscode.Position(position.line, 0)
        );
        if (lineStartOffset > 0) {
          lexer.take(lineStartOffset);
          if (debug) {
            console.log(`lineStartOffset: ${lineStartOffset}`);
          }
        }

        while (true) {
          const token = lexer.lex();
          if (token === null) {
            break;
          }

          if (debug) {
            console.log(token);
          }

          if (
            token.type === "string" &&
            token.start <= offset &&
            token.start + token.content.length >= offset
          ) {
            // escape '`' for markdown code block
            const longestMatchLength =
              token.content
                .match(/`+/g)
                ?.reduce((a, b) => (a.length > b.length ? a : b)).length ?? 0;
            const codeblockBorderLength =
              longestMatchLength >= 3 ? longestMatchLength + 1 : 3;

            // the markdown result
            const md = [
              `${"`".repeat(codeblockBorderLength)}txt`,
              `${JSON.parse(token.content)}`,
              `${"`".repeat(codeblockBorderLength)}`,
            ].join("\n");

            if (debug) {
              console.log(md);
            }

            return {
              contents: [md],
            };
          }
        }
      },
    })
  );
}

export function deactivate() {}
