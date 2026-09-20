import { executeCode, stripComments, normalizeJavaCode } from '../services/executionService.js';

async function runTests() {
  console.log('========================================================');
  console.log('STARTING EXTENSIVE EXECUTION ENGINE TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Verify comment stripping logic
  console.log('--- TEST 1: Comment Stripping Verification ---');
  const codeWithComments = `
// System.out.println("FAIL_COMMENT_1");
/*
System.out.println("FAIL_COMMENT_2");
*/
int a = 10; // inline comment
String str = "http://url-with-slashes.com"; // keep valid URL strings!
`;
  const stripped = stripComments(codeWithComments, 'java');
  if (!stripped.includes('FAIL_COMMENT_1') && !stripped.includes('FAIL_COMMENT_2') && stripped.includes('http://url-with-slashes.com')) {
    console.log('✅ TEST 1 PASSED: Comments correctly stripped and string literals preserved.');
    passed++;
  } else {
    console.error('❌ TEST 1 FAILED: Comment stripping issue:\n', stripped);
    failed++;
  }

  // Test 2: Java execution with Scanner stdin, comments, and complex class
  console.log('\n--- TEST 2: Java Complex Class + Scanner Stdin + Comments ---');
  const javaCode = `
// System.out.println("THIS_COMMENTED_PRINT_MUST_NOT_EXECUTE");
/*
 * Multi-line comment block
 * System.out.println("COMMENT_BLOCK_SHOULD_NOT_EXECUTE");
 */
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        System.out.println("Java Complex Execution Started");
        Scanner sc = new Scanner(System.in);
        if (sc.hasNext()) {
            String val = sc.next();
            System.out.println("Echo Stdin: " + val);
        }
        // Test ArrayList and Sorting (complex Java API)
        List<Integer> numbers = new ArrayList<>(Arrays.asList(42, 17, 99, 3));
        Collections.sort(numbers);
        System.out.println("Sorted List: " + numbers);
    }
}
`;
  const javaRes = await executeCode({
    language: 'java',
    code: javaCode,
    stdin: 'AntigravityStdinToken',
  });

  console.log('Java Output:\n', javaRes.stdout);
  if (
    javaRes.success &&
    javaRes.stdout.includes('Java Complex Execution Started') &&
    javaRes.stdout.includes('Echo Stdin: AntigravityStdinToken') &&
    javaRes.stdout.includes('Sorted List: [3, 17, 42, 99]') &&
    !javaRes.stdout.includes('THIS_COMMENTED_PRINT_MUST_NOT_EXECUTE') &&
    !javaRes.stdout.includes('COMMENT_BLOCK_SHOULD_NOT_EXECUTE')
  ) {
    console.log('✅ TEST 2 PASSED: Java execution, comments ignored, Scanner stdin received, and Collections API works.');
    passed++;
  } else {
    console.error('❌ TEST 2 FAILED:', javaRes);
    failed++;
  }

  // Test 3: Python execution with input(), stdin, and comments
  console.log('\n--- TEST 3: Python 3 Stdin + Comments ---');
  const pyCode = `
# print("FAIL_PYTHON_COMMENT")
"""
print("FAIL_PYTHON_DOCSTRING")
"""
import sys

name = input()
print(f"Hello, {name} from Python!")
print("Python 3 Computation:", sum([i for i in range(1, 6)]))
`;
  const pyRes = await executeCode({
    language: 'python',
    code: pyCode,
    stdin: 'AliceDeveloper',
  });

  console.log('Python Output:\n', pyRes.stdout);
  if (
    pyRes.success &&
    pyRes.stdout.includes('Hello, AliceDeveloper from Python!') &&
    pyRes.stdout.includes('Python 3 Computation: 15') &&
    !pyRes.stdout.includes('FAIL_PYTHON_COMMENT') &&
    !pyRes.stdout.includes('FAIL_PYTHON_DOCSTRING')
  ) {
    console.log('✅ TEST 3 PASSED: Python stdin received and comments completely ignored.');
    passed++;
  } else {
    console.error('❌ TEST 3 FAILED:', pyRes);
    failed++;
  }

  // Test 4: C++ execution with cin and vector
  console.log('\n--- TEST 4: C++ Stdin + Vectors + Comments ---');
  const cppCode = `
// cout << "FAIL_CPP_COMMENT" << endl;
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string word;
    if (cin >> word) {
        cout << "C++ Received Stdin: " << word << endl;
    }
    vector<int> v = {5, 2, 8, 1};
    sort(v.begin(), v.end());
    cout << "C++ Min: " << v.front() << " Max: " << v.back() << endl;
    return 0;
}
`;
  const cppRes = await executeCode({
    language: 'cpp',
    code: cppCode,
    stdin: 'CppRocks',
  });

  console.log('C++ Output:\n', cppRes.stdout);
  if (
    cppRes.success &&
    cppRes.stdout.includes('C++ Received Stdin: CppRocks') &&
    cppRes.stdout.includes('C++ Min: 1 Max: 8') &&
    !cppRes.stdout.includes('FAIL_CPP_COMMENT')
  ) {
    console.log('✅ TEST 4 PASSED: C++ cin stdin, vectors, algorithms, and comments ignored.');
    passed++;
  } else {
    console.error('❌ TEST 4 FAILED:', cppRes);
    failed++;
  }

  // Test 5: Java bare statements (no class, no main) auto-wrap
  console.log('\n--- TEST 5: Java Bare Statements Auto-Wrap ---');
  const bareJava = `
// Bare snippet
Scanner sc = new Scanner(System.in);
String token = sc.next();
System.out.println("Bare Java Stdin: " + token);
`;
  const bareRes = await executeCode({
    language: 'java',
    code: bareJava,
    stdin: 'BareTokenSuccess',
  });

  console.log('Bare Java Output:\n', bareRes.stdout);
  if (bareRes.success && bareRes.stdout.includes('Bare Java Stdin: BareTokenSuccess')) {
    console.log('✅ TEST 5 PASSED: Naked Java snippet auto-wrapped and executed.');
    passed++;
  } else {
    console.error('❌ TEST 5 FAILED:', bareRes);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
