document.querySelector(".submit").addEventListener("click", async function (e) {
    e.preventDefault(); // Prevent form from submitting traditionally

    // Collect form data
    let name = document.getElementById("name").value;
    let dob = document.getElementById("dob").value;
    let address = document.getElementById("add").value;
    let phoneNumber = document.getElementById("number").value;
    let confirmNumber = document.getElementById("numconfirm").value;

    if (!phoneNumber || !confirmNumber) {
        alert("Phone number is required");
        return;
    }
    if (phoneNumber !== confirmNumber) {
        alert("Phone numbers do not match");
        return;
    }

    try {
        // Send registration data to the backend
        const response = await fetch('http://localhost:3000/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 166b4a', // Replace with your actual token if necessary
            },
            body: JSON.stringify({
                phoneNumber: phoneNumber,
                name: name,
                dob: dob,
                address: address
            })
        });

        if (response.status === 409) {
            alert('The phone number has already been used to register, use another one');
            return;
        }

        if (response.ok) {
            alert('Registration successful!');
            window.location.href = 'personal.html';
        } else {
            const errorText = await response.text();
            alert(`Registration failed: ${errorText}`);
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration. Please try again.');
    }
});
