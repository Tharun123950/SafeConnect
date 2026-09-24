

async function test() {
    console.log("Simulating tharun_sai login...");
    const loginRes = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'tharun_sai', password: '325698abc' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Token obtained:", token ? "YES" : "NO");

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log("\nFetching chats list initially...");
    const chatListRes = await fetch('http://localhost:5000/api/chats', { headers });
    const chatListData = await chatListRes.json();
    console.log("Initial chats list:", JSON.stringify(chatListData, null, 2));

    console.log("\nFetching chat thread with tharun_battu...");
    const threadRes = await fetch('http://localhost:5000/api/chats/tharun_battu', { headers });
    const threadData = await threadRes.json();
    console.log("Thread data keys:", Object.keys(threadData));
    console.log("Thread conversationId:", threadData.conversationId);
    console.log("Thread targetUserId:", threadData.targetUserId);

    console.log("\nSending message to tharun_battu...");
    const sendRes = await fetch('http://localhost:5000/api/chats/message', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            receiverId: threadData.targetUserId,
            text: "Hi program"
        })
    });
    const sendData = await sendRes.json();
    console.log("Send data success:", sendData.success);

    console.log("\nFetching chats list after sending...");
    const chatListRes2 = await fetch('http://localhost:5000/api/chats', { headers });
    const chatListData2 = await chatListRes2.json();
    console.log("After send chats list:", JSON.stringify(chatListData2, null, 2));
}

test().catch(console.error);
