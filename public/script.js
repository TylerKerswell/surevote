document.getElementById('checkStatusBtn').addEventListener('click', () => {
    
    let lat = document.getElementById('lat').value;
    let lon = document.getElementById('lon').value;
    if(lat === '') lat = 0;
    if(lon === '') lon = 0;

    // Construct the URL with the user's input
    fetch(`http://localhost:3000/getLocationStatus/${lat}/${lon}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text(); // Assuming the server responds with text
        })
        .then(data => {
            // Update the responseText paragraph with the server's response
            document.getElementById('responseText').innerText = data;
        })
        .catch(error => {
            // Handle errors and update the responseText with an error message
            console.error('Fetch error:', error);
            document.getElementById('responseText').innerText = `Error: ${error.message}`;
        });
});