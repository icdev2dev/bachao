THIS SOFTWARE IS PROVIDED AS-IS. DO YOUR OWN DUE DILIGENCE. NO GUARANTEES - IMPLIED OR OTHERWISE. SEE LICENSE FOR DETAILS. ALWAYS TEST RECOVERY MECHANISMS PERIODICALLY.

# Use Case
Bachao is intended to solve for the primary use case of when you lose your internet identity's primary authentication mechanisms (yubi key, phone, computer etc) either through accident or theft. Essentially you inform your a set of your trusted friends and family about your internet identity in anticipation of this loss. When such a loss occurs, a subset of your trusted friends/family can vouch for your identity and your internet identity can be restored.

## Acknowledgements
The code from the following github reps were used:
https://github.com/gburca/ssss-js
https://github.com/papnkukn/qrcode-svg
adhering to the licensing as described and understood.


## MVP
Internet Computer's Internet Identity (http://identity.ic0.app/) provides a mechanism to create an internet identity. Additionally it provides a mechansim to recovery your internet identity through a 'recovery phrase'. The objective of the MVP is to take that recovery phrase and translate that into a set of tokens; which can be distributed to my trusted friends and family. I would not have the 'recovery phrase'. When I need to recover my lost identity (which hopefully is never), I can ask my friends and family to vouch for my identity through those distributed tokens. I can use that "proof" to recover my recovery phrase permissionlessly. Obviously there are many nuances that needs to be explained; which will the subject of next sections.


|    Generate Tokens    |    Test Tokens    |    Recover Secret    |
| --------------------- | ----------------- | -------------------- |
| ![Step 1 of 3](https://github.com/icdev2dev/bachao/blob/main/assets/bachao1of3.jpg)|![Step 2 of 3](https://github.com/icdev2dev/bachao/blob/main/assets/bachao2of3.jpg)|![Step 3 of 3](https://github.com/icdev2dev/bachao/blob/main/assets/bachao3of3.jpg)|