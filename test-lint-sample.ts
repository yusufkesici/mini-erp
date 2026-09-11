const x = 1;
var y = 2;

const apiKey = 'sk-test-hardcoded-secret-1234567890';

function buildQuery(userInput: string) {
  return "SELECT * FROM products WHERE code = '" + userInput + "'";
}
