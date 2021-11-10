THIS SOFTWARE IS PROVIDED AS-IS. DO YOUR OWN DUE DILIGENCE. NO GUARANTEES - IMPLIED OR OTHERWISE. SEE LICENSE FOR DETAILS. ALWAYS TEST RECOVERY MECHANISMS PERIODICALLY.

# Use Case
Bachao is intended to solve for the primary use case of when I lose my internet identity's primary authentication mechanisms (yubi key, phone, computer etc) either through accident or theft. Essentially I would inform a set of my trusted friends and family about my internet identity in anticipation of this loss. When such a loss occurs, a subset of my trusted friends/family can vouch for my identity and my internet identity can be restored.

## Acknowledgements
The code from the following github reps were used:
https://github.com/gburca/ssss-js
https://github.com/papnkukn/qrcode-svg
adhering to the licensing as described and understood.


## MVP
Internet Computer's Internet Identity (http://identity.ic0.app/) provides a mechanism to create an internet identity. Additionally it provides a mechansim to recovery my internet identity through a 'recovery phrase'. The objective of the MVP is to take that recovery phrase and translate that into a set of tokens; which can be distributed to my trusted friends and family. I would not have the 'recovery phrase'. When I need to recover my lost identity (which hopefully is never), I can ask my friends and family to vouch for my identity through those distributed tokens. I can use that "proof" to recover my recovery phrase permissionlessly. Obviously there are many nuances that needs to be explained; which will the subject of next sections.


|    Generate Tokens    |    Test Tokens    |    Recover Secret    |
| --------------------- | ----------------- | -------------------- |
| ![Step 1 of 3](https://github.com/icdev2dev/bachao/blob/main/assets/bachao1of3.jpg)|![Step 2 of 3](https://github.com/icdev2dev/bachao/blob/main/assets/bachao2of3.jpg)|![Step 3 of 3](https://github.com/icdev2dev/bachao/blob/main/assets/bachao3of3.jpg)|

## How to run
First of all, this is an MVP. So Caveat Emptor. The HTML is structured to be used on a standalone basis. No internet connection is required to run this on browser. Dev and Token creation has been done on Chrome in Ubuntu and Windows. Currently I just  just download the zip and open the bachao.html on the browser on the local computer.

## Dev Thoughts
This is just a dump of my thoughts; as I was building this utility.

### Support of bip39
This is a no brainer. Most modern wallets have  seed phrases are based on this.

### Multiple wallets
Different wallets have different additional data associated with the seed phrase (if they do have additional data). Internet Computer Identity asserts the anchor number as a part of the recovery phrase in addition to actual 24 phrases from the bip39. Stoic wallet on the other hand just has 12 phrases from the bip39. 

### On the shoulder of giants
I had no intention of rewriting entire encryption libraries or token generation mechanisms. Utilizing Shamir's Secret Sharing Scheme(ssss) seemed to be best option; because it is available on UNIX/Linux machine and it is free software. See http://point-at-infinity.org/ssss/. Additionally at least one javascript library is compatible with ssss (which I am using). 

### Algorithmic Limitations
The SSSS can take in only a limited numbers of bytes. So need to operate on those limitations; from a data compression standpoint.

### Tired of encoding my seed phrases into a cold wallet.
The perennial thought of losing my seed phrases was constantly in my mind. With so many different wallets and with each one demanding that I write down the seed phrases (with good reason), it just became unsustainable. Additionally with climate changes, flooding, earthquakes etc, the centralized failure point (the platinum cold wallet) was a also a consideration.

### Longetivity
If I am going to be my own bank, obviously I would need to manage the security of the keys to the bank; so to speak. But what if Javascript is not supported in the future? What if Chrome goes away? How would I decode these tokens in 10 years from now? For this , the basic mechanism of encryption-decryption is supposed to be compatabile with ssss utility. I have tested this out with 

### What if Chrome does not support Javascript in far future or what if chrome is gone?
There is always ssss which is compatible with the token generation. 


## Operational Thoughts

### Who should I send the individual tokens to ?
Remembering each individual token has no operational context. Only in conjuction with other tokens, it has enormous power. Geolocation is important as well.
### Recovery Phrase rotation
To the extent that wallets offer the ability change recovery phrases, how to use that to my advantage. 
