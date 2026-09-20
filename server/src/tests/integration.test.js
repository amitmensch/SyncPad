import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runIntegrationSuite() {
  console.log('========================================================');
  console.log('STARTING FULL-STACK SYNCPAD INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Register a valid user
    console.log('--- TEST 1: User Registration ---');
    const testUsername = `dev_${Date.now()}`;
    const testEmail = `${testUsername}@syncpad.dev`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      username: testUsername,
      email: testEmail,
      password: 'StrongPassword123!',
    });

    if (regRes.status === 201 && regRes.data.token && regRes.data.user) {
      console.log(`✅ TEST 1 PASSED: Registered user '${testUsername}' successfully with token.`);
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED: Could not register user.', regRes.data);
      failed++;
    }

    const authToken = regRes.data.token;
    const authHeaders = { Authorization: `Bearer ${authToken}` };

    // 2. Create Room as Authenticated User with custom details
    console.log('\n--- TEST 2: Room Creation with Details (No Random Names) ---');
    const roomTitle = 'Advanced Distributed Systems Room';
    const roomDesc = 'Deep-dive into Raft consensus, threading, and Scanner inputs';
    const customId = `algo-${Date.now()}`;

    const createRes = await axios.post(
      `${BASE_URL}/rooms`,
      {
        title: roomTitle,
        customRoomId: customId,
        language: 'java',
        description: roomDesc,
        isPublic: true,
      },
      { headers: authHeaders }
    );

    if (
      createRes.status === 201 &&
      createRes.data.room &&
      createRes.data.room.title === roomTitle &&
      createRes.data.room.roomId === customId &&
      createRes.data.room.language === 'java'
    ) {
      console.log(`✅ TEST 2 PASSED: Room created with custom title '${roomTitle}' and ID '${customId}'.`);
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Room creation mismatch.', createRes.data);
      failed++;
    }

    // 3. Verify Room is listed in user's mine and explore
    console.log('\n--- TEST 3: Verify Room in User Workspace & Explore ---');
    const mineRes = await axios.get(`${BASE_URL}/rooms/user/mine`, { headers: authHeaders });
    const userRooms = mineRes.data.createdRooms || [];
    const foundMine = userRooms.some((r) => r.roomId === customId);

    const exploreRes = await axios.get(`${BASE_URL}/rooms`);
    const publicRooms = exploreRes.data.rooms || [];
    const foundPublic = publicRooms.some((r) => r.roomId === customId);

    if (foundMine && foundPublic) {
      console.log('✅ TEST 3 PASSED: Room visible in user workspace and public explore.');
      passed++;
    } else {
      console.error(`❌ TEST 3 FAILED: foundMine=${foundMine}, foundPublic=${foundPublic}`);
      failed++;
    }

    // 4. Test Code Execution with Comments and Stdin for Java
    console.log('\n--- TEST 4: Execute Java Code with Stdin & Comments ---');
    const javaCode = `
// System.out.println("COMMENTED_CODE_SHOULD_NEVER_RUN");
/*
 * Block comment with quote ' and slash /
 * System.out.println("BLOCK_COMMENT_SHOULD_NEVER_RUN");
 */
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        System.out.println("Java Sandbox Active");
        Scanner sc = new Scanner(System.in);
        if (sc.hasNext()) {
            System.out.println("Echo Stdin: " + sc.next());
        }
    }
}
`;
    const execJavaRes = await axios.post(`${BASE_URL}/execute`, {
      language: 'java',
      code: javaCode,
      stdin: 'JavaTestValue999',
    });

    const jOut = execJavaRes.data;
    console.log('Java Stdout:\n', jOut.stdout);
    if (
      jOut.success &&
      jOut.stdout.includes('Java Sandbox Active') &&
      jOut.stdout.includes('Echo Stdin: JavaTestValue999') &&
      !jOut.stdout.includes('COMMENTED_CODE_SHOULD_NEVER_RUN') &&
      !jOut.stdout.includes('BLOCK_COMMENT_SHOULD_NEVER_RUN')
    ) {
      console.log('✅ TEST 4 PASSED: Java executed, comments ignored, Scanner stdin received.');
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED: Java execution did not match expected output.', jOut);
      failed++;
    }

    // 5. Test Code Execution with Comments and Stdin for C++
    console.log('\n--- TEST 5: Execute C++ Code with Stdin & Comments ---');
    const cppCode = `
// cout << "COMMENTED_CPP" << endl;
#include <iostream>
#include <string>
using namespace std;

int main() {
    cout << "C++ Compiler Active" << endl;
    string token;
    if (cin >> token) {
        cout << "C++ Stdin: " << token << endl;
    }
    return 0;
}
`;
    const execCppRes = await axios.post(`${BASE_URL}/execute`, {
      language: 'cpp',
      code: cppCode,
      stdin: 'CppTestInput777',
    });

    const cOut = execCppRes.data;
    console.log('C++ Stdout:\n', cOut.stdout);
    if (
      cOut.success &&
      cOut.stdout.includes('C++ Compiler Active') &&
      cOut.stdout.includes('C++ Stdin: CppTestInput777') &&
      !cOut.stdout.includes('COMMENTED_CPP')
    ) {
      console.log('✅ TEST 5 PASSED: C++ executed, comments ignored, cin stdin received.');
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED: C++ execution output mismatch.', cOut);
      failed++;
    }

    // 6. Test Code Execution with Comments and Stdin for Python
    console.log('\n--- TEST 6: Execute Python Code with Stdin & Comments ---');
    const pyCode = `
# print("COMMENTED_PYTHON")
import sys
token = input()
print("Python Stdin:", token)
`;
    const execPyRes = await axios.post(`${BASE_URL}/execute`, {
      language: 'python',
      code: pyCode,
      stdin: 'PythonToken555',
    });

    const pOut = execPyRes.data;
    console.log('Python Stdout:\n', pOut.stdout);
    if (
      pOut.success &&
      pOut.stdout.includes('Python Stdin: PythonToken555') &&
      !pOut.stdout.includes('COMMENTED_PYTHON')
    ) {
      console.log('✅ TEST 6 PASSED: Python executed, comments ignored, input() received.');
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED: Python execution output mismatch.', pOut);
      failed++;
    }

    console.log('\n========================================================');
    console.log(`FULL-STACK INTEGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('FATAL ERROR in Integration Suite:', err.message, err.response?.data);
    process.exit(1);
  }
}

runIntegrationSuite();
