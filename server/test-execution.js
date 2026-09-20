import { executeCode } from './src/services/executionService.js';

async function testAll() {
  console.log('🧪 Testing Execution Engine...');

  // Test 1: Comments MUST NOT execute
  const javaCommentedCode = `
    public class Main {
      public static void main(String[] args) {
        // System.out.println("THIS_SHOULD_NOT_EXECUTE");
        /*
        System.out.println("BLOCK_COMMENT_SHOULD_NOT_EXECUTE");
        */
        System.out.println("VALID_EXECUTION");
      }
    }
  `;
  const res1 = await executeCode({ language: 'java', code: javaCommentedCode });
  console.log('\n--- Test 1: Comment Strip (Java) ---');
  console.log('Stdout:', res1.stdout);
  if (res1.stdout.includes('THIS_SHOULD_NOT_EXECUTE') || res1.stdout.includes('BLOCK_COMMENT')) {
    console.error('❌ FAIL: Commented code executed!');
    process.exit(1);
  } else {
    console.log(' PASS: Commented lines were completely ignored.');
  }

  // Test 2: Python Stdin and Comments
  const pyStdinCode = `
# print("COMMENTED_PYTHON")
"""
print("BLOCK_PYTHON")
"""
name = input()
print("Hello", name)
`;
  const res2 = await executeCode({ language: 'python', code: pyStdinCode, stdin: 'AntigravityDev' });
  console.log('\n--- Test 2: Python Stdin & Comments ---');
  console.log('Stdout:', res2.stdout);
  if (res2.stdout.includes('COMMENTED') || !res2.stdout.includes('AntigravityDev')) {
    console.error('❌ FAIL: Python stdin or comments failed!');
    process.exit(1);
  } else {
    console.log(' PASS: Python handled stdin and ignored comments.');
  }

  // Test 3: Java Complex Algorithm & Scanner Stdin
  const javaComplexCode = `
    import java.util.Scanner;
    public class Main {
      static int fib(int n) {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
      }
      public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        int sum = a + b;
        System.out.println("Sum: " + sum);
        System.out.println("Fib(7): " + fib(7));
        int[] arr = {10, 20, 30};
        int total = 0;
        for (int x : arr) {
          total += x;
        }
        System.out.println("Total: " + total);
      }
    }
  `;
  const res3 = await executeCode({ language: 'java', code: javaComplexCode, stdin: '40 60' });
  console.log('\n--- Test 3: Java Complex Algorithm & Scanner Stdin ---');
  console.log('Stdout:', res3.stdout);
  if (!res3.stdout.includes('Sum: 100') || !res3.stdout.includes('Fib(7): 13') || !res3.stdout.includes('Total: 60')) {
    console.error('❌ FAIL: Java complex execution failed!', res3);
    process.exit(1);
  } else {
    console.log(' PASS: Java complex recursion, loops, arrays, and Scanner stdin all succeeded!');
  }

  // Test 4: C++ Complex Code & cin Stdin
  const cppCode = `
    #include <iostream>
    using namespace std;
    int main() {
      // cout << "COMMENTED_CPP" << endl;
      int x, y;
      cin >> x >> y;
      int product = x * y;
      cout << "Product is: " << product << endl;
      return 0;
    }
  `;
  const res4 = await executeCode({ language: 'cpp', code: cppCode, stdin: '9 8' });
  console.log('\n--- Test 4: C++ Stdin and cin ---');
  console.log('Stdout:', res4.stdout);
  if (!res4.stdout.includes('Product is: 72') || res4.stdout.includes('COMMENTED')) {
    console.error('❌ FAIL: C++ cin failed!', res4);
    process.exit(1);
  } else {
    console.log(' PASS: C++ cin stdin and multiplication succeeded!');
  }

  // Test 5: TypeScript Execution
  const tsCode = `
    interface Hero {
      name: string;
      level: number;
    }
    const hero: Hero = { name: "Warrior", level: 99 };
    console.log("Hero level:", hero.level);
  `;
  const res5 = await executeCode({ language: 'typescript', code: tsCode });
  console.log('\n--- Test 5: TypeScript ---');
  console.log('Stdout:', res5.stdout);
  if (!res5.stdout.includes('Hero level: 99')) {
    console.error('❌ FAIL: TS failed!', res5);
    process.exit(1);
  } else {
    console.log(' PASS: TypeScript executed successfully.');
  }

  console.log('\n🎉 ALL EXECUTION ENGINE TESTS PASSED PERFECTLY!');
  process.exit(0);
}

testAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
