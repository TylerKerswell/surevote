document.querySelector(".submit").addEventListener("click", async function (e) {

    let msg = document.getElementById("msg").value;
    console.log(msg);
    console.log(typeof msg);
    console.log(msg.length);

    const response = await fetch('https://surevote.vercel.app/admin/startvote/', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer 166b4a',
            'Content-Type': 'application/json',
            "Host": "surevote.vercel.app"
        },
        body: JSON.stringify({
            "sim_swap_date": "2023-10-06T01:43:03.171Z", 
            "lat": "49.266910", 
            "lon": "-123.247415", 
            "accuracy": "100", 
            "ballot_message": `${msg}`
        })
    });

    console.log(response);
});