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
            return {
              contents: [
                new vscode.MarkdownString().appendText(
                  // use JSON.parse to eval all escaped characters
                  JSON.parse(token.content)
                ),
              ],
            };
          }
        }
      },
    })
  );
}

export function deactivate() {}
