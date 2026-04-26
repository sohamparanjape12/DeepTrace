// test-intelligence.js
async function runTest() {
    console.log("Sending request to Intelligence Layer...");

    const response = await fetch('http://localhost:3000/api/analyze-context', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            // We are simulating an unauthorized commercial post
            imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png",
            caption: "Selling these bootleg jerseys for $50! Grab it now before we get banned 😂",
            surroundingText: "Check the link in bio to buy unauthorized merch.",
            hashtags: ["#bootleg", "#cheap", "#fakes"],
            metadata: {
                platform: "Instagram",
                accountAge: "2 days"
            }
        })
    });

    const data = await response.json();
    console.log("\n--- Analysis Result ---");
    console.log(JSON.stringify(data, null, 2));
}

runTest();
