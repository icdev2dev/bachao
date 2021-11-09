/* global define self */
;(function (globalObj) {
  'use strict'

  var BN = require('bignumber.js')
  BN.config({EXPONENTIAL_AT: 100})
  var mpz = require('./mpz.js')
  var bip39_json = require('./bip39.json')
    
  var SSSS
  var MAXDEGREE = 1024
  var MAXTOKENLEN = 128
  var ENCODE = 0
  var DECODE = 1

  /* coefficients of some irreducible polynomials over GF(2) */
  var irredCoeff = [
    4, 3, 1, 5, 3, 1, 4, 3, 1, 7, 3, 2, 5, 4, 3, 5, 3, 2, 7, 4, 2, 4, 3, 1, 10, 9, 3, 9, 4, 2, 7, 6, 2, 10, 9,
    6, 4, 3, 1, 5, 4, 3, 4, 3, 1, 7, 2, 1, 5, 3, 2, 7, 4, 2, 6, 3, 2, 5, 3, 2, 15, 3, 2, 11, 3, 2, 9, 8, 7, 7,
    2, 1, 5, 3, 2, 9, 3, 1, 7, 3, 1, 9, 8, 3, 9, 4, 2, 8, 5, 3, 15, 14, 10, 10, 5, 2, 9, 6, 2, 9, 3, 2, 9, 5,
    2, 11, 10, 1, 7, 3, 2, 11, 2, 1, 9, 7, 4, 4, 3, 1, 8, 3, 1, 7, 4, 1, 7, 2, 1, 13, 11, 6, 5, 3, 2, 7, 3, 2,
    8, 7, 5, 12, 3, 2, 13, 10, 6, 5, 3, 2, 5, 3, 2, 9, 5, 2, 9, 7, 2, 13, 4, 3, 4, 3, 1, 11, 6, 4, 18, 9, 6,
    19, 18, 13, 11, 3, 2, 15, 9, 6, 4, 3, 1, 16, 5, 2, 15, 14, 6, 8, 5, 2, 15, 11, 2, 11, 6, 2, 7, 5, 3, 8,
    3, 1, 19, 16, 9, 11, 9, 6, 15, 7, 6, 13, 4, 3, 14, 13, 3, 13, 6, 3, 9, 5, 2, 19, 13, 6, 19, 10, 3, 11,
    6, 5, 9, 2, 1, 14, 3, 2, 13, 3, 1, 7, 5, 4, 11, 9, 8, 11, 6, 5, 23, 16, 9, 19, 14, 6, 23, 10, 2, 8, 3,
    2, 5, 4, 3, 9, 6, 4, 4, 3, 2, 13, 8, 6, 13, 11, 1, 13, 10, 3, 11, 6, 5, 19, 17, 4, 15, 14, 7, 13, 9, 6,
    9, 7, 3, 9, 7, 1, 14, 3, 2, 11, 8, 2, 11, 6, 4, 13, 5, 2, 11, 5, 1, 11, 4, 1, 19, 10, 3, 21, 10, 6, 13,
    3, 1, 15, 7, 5, 19, 18, 10, 7, 5, 3, 12, 7, 2, 7, 5, 1, 14, 9, 6, 10, 3, 2, 15, 13, 12, 12, 11, 9, 16,
    9, 7, 12, 9, 3, 9, 5, 2, 17, 10, 6, 24, 9, 3, 17, 15, 13, 5, 4, 3, 19, 17, 8, 15, 6, 3, 19, 6, 1 ]

  function constructorFactory () {
    var P = SSSS.prototype

    // Constructor
    function SSSS (threshold, numberOfKeys, inputIsHex) {
      if (!(this instanceof SSSS)) {
        return new SSSS(threshold, numberOfKeys, inputIsHex)
      }

      if (numberOfKeys > 0 && threshold > numberOfKeys) {
        threshold = numberOfKeys
      }
      this.opt_threshold = threshold
      this.opt_number = numberOfKeys
      if (typeof (inputIsHex) === 'boolean') {
        this.opt_hex = inputIsHex
      } else {
        this.opt_hex = false
      }
      this.opt_diffusion = true
    }

    // Private helper functions
    function fatal (msg) {
      console.error('FATAL: ' + msg)
      throw msg
    }
    function warning (msg) {
      console.warn(msg)
    }
    function assert (pred, msg) {
      if (!pred) fatal('Assertion failed: ' + msg)
    }

    function fieldSizeValid (deg) {
      // A multiple of 8
      return (deg >= 8) && (deg <= MAXDEGREE) && (deg % 8 === 0)
    }

    /* I/O routines for GF(2^deg) field elements */

    /**
     * if hexmode == false, s is a string, else it's a byte array.
     * @returns {BigNumber}
     */
    function fieldImport (s, hexmode, deg) {
      if (hexmode) {
        if (s.length > deg / 4) { fatal('input string too long') }
        if (s.length < deg / 4) {
          warning('input string too short, adding null padding on the left')
        }
        var x = mpz.set_str(s, 16)
        if (x.isNegative()) {
          fatal('invalid syntax')
        }
        return x
      } else {
        var i
        var warn = false
        if (s.length > deg / 8) { fatal('input string too long') }
        for (i = s.length - 1; i >= 0; i--) {
          warn = warn || (s.charCodeAt(i) < 32) || (s.charCodeAt(i) >= 127)
        }
        if (warn) warning('Non-ASCII data detected, use hex mode instead')
        return mpz.import(mpz.ORDER_MSB, mpz.ENDIAN_HOST, s)
      }
    }

    function fieldPrint (x, hexmode, deg) {
      var i
      var res = ''
      if (hexmode) {
        for (i = deg / 4 - mpz.sizeinbase(x, 16); i; i--) { res += '0' }
        res += x.toString(16)
        return res
      } else {
        // char buf[MAXDEGREE / 8 + 1];
        var warn = false
        var buf = mpz.export(mpz.ORDER_MSB, 1, mpz.ENDIAN_HOST, x)
        buf.forEach(function (val) {
          var printable = (val >= 32) && (val < 127)
          warn = warn || !printable
          res += printable ? String.fromCharCode(val) : '.'
        })
        if (warn) warning('Non-ASCII data detected, use hex mode instead')
        return res
      }
    }

    /* basic field arithmetic in GF(2^deg) */

    function fieldAdd (x, y) {
      return mpz.xor(x, y)
    }

    P.field_mult = function (x, y) {
      var z
      var b = x
      if (mpz.tstbit(y, 0)) {
        z = b
      } else {
        z = new BN(0)
      }

      for (var i = 1; i < this.degree; i++) {
        b = mpz.lshift(b, 1)
        if (mpz.tstbit(b, this.degree)) { b = mpz.xor(b, this.poly) }
        if (mpz.tstbit(y, i)) { z = mpz.xor(z, b) }
      }

      return z
    }

    P.field_invert = function (x) {
      assert(mpz.cmp_ui(x, 0))
      var h
      var u = x
      var v = this.poly
      var g = new BN(0)
      var z = new BN(1)
      while (mpz.cmp_ui(u, 1)) {
        var i = mpz.sizeinbits(u) - mpz.sizeinbits(v)
        if (i < 0) {
          v = mpz.swap(u, u = v)
          g = mpz.swap(z, z = g)
          i = -i
        }
        h = mpz.lshift(v, i)
        u = mpz.xor(u, h)
        h = mpz.lshift(g, i)
        z = mpz.xor(z, h)
      }
      return z
    }

    /* routines for the random number generator */

    function cprngRead (deg) {
      var buf = new Uint8Array(deg / 8)
      mpz.randIntArray(buf)
      // For debug only!
      // buf.forEach(function(v, i, a) {
      //  a[i] = i;
      // });
      return mpz.import(mpz.ORDER_MSB, mpz.ENDIAN_HOST, buf)
    }

    /* a 64 bit pseudo random permutation (based on the XTEA cipher) */

    /**
     * @param {Uint32Array} v
     */
    function encipherBlock (v) {
      var sum = 0
      var delta = 0x9E3779B9

      for (var i = 0; i < 32; i++) {
        v[0] += (((v[1] << 4) ^ (v[1] >>> 5)) + v[1]) ^ sum
        sum += delta
        v[1] += (((v[0] << 4) ^ (v[0] >>> 5)) + v[0]) ^ sum
      }
    }

    /**
     * @param {Uint32Array} v
     */
    function decipherBlock (v) {
      var sum = 0xC6EF3720
      var delta = 0x9E3779B9
      for (var i = 0; i < 32; i++) {
        v[1] -= ((v[0] << 4 ^ v[0] >>> 5) + v[0]) ^ sum
        sum -= delta
        v[0] -= ((v[1] << 4 ^ v[1] >>> 5) + v[1]) ^ sum
      }
    }

    /**
     * @param {Uint8Array} data
     * @param {Number} idx
     * @param {Number} len
     * @param {Function} processBlock
     */
    function encodeSlice (data, idx, len, processBlock) {
      var v = new Uint32Array(2)
      var i
      for (i = 0; i < 2; i++) {
        v[i] = data[(idx + 4 * i) % len] << 24 |
               data[(idx + 4 * i + 1) % len] << 16 |
               data[(idx + 4 * i + 2) % len] << 8 |
               data[(idx + 4 * i + 3) % len]
      }
      processBlock(v)
      for (i = 0; i < 2; i++) {
        data[(idx + 4 * i + 0) % len] = v[i] >>> 24
        data[(idx + 4 * i + 1) % len] = (v[i] >>> 16) & 0xff
        data[(idx + 4 * i + 2) % len] = (v[i] >>> 8) & 0xff
        data[(idx + 4 * i + 3) % len] = v[i] & 0xff
      }
    }

    /**
     * @param {BigNumber} x
     * @param {Number} encdecmode ENCODE | DECODE
     * @return x
     */
    function encodeMpz (x, encdecmode, deg) {
      var v16 = mpz.export(mpz.ORDER_LSB, 2, mpz.ENDIAN_MSB, x)
      // warning(x.toString(16));
      // v16.forEach(function(val, idx, arr) {
      //  console.log(val.toString(16));
      // });
      var v = new Uint8Array(v16.buffer)

      if (deg % 16 === 8) {
        v[deg / 8 - 1] = v[deg / 8]
      }

      var i
      if (encdecmode === ENCODE) { /* 40 rounds are more than enough! */
        for (i = 0; i < 40 * (deg / 8); i += 2) {
          encodeSlice(v, i, deg / 8, encipherBlock)
        }
      } else {
        for (i = 40 * (deg / 8) - 2; i >= 0; i -= 2) {
          encodeSlice(v, i, deg / 8, decipherBlock)
        }
      }

      if (deg % 16 === 8) {
        v[deg / 8] = v[deg / 8 - 1]
        v[deg / 8 - 1] = 0
      }

      x = mpz.import(mpz.ORDER_LSB, mpz.ENDIAN_MSB, v16)
      // warning(x.toString(16))
      // v16.forEach(function(val, idx, arr) {
      //  console.log(val.toString(16));
      // });

      assert(mpz.sizeinbits(x) <= deg)
      return x
    }

    /* evaluate polynomials efficiently */

    /**
     * @param {Number} n
     * @param {BigNumber} x
     * @param {BigNumber array} coeff
     * @returns y
     */
    P.horner = function (n, x, coeff) {
      var y = new BN(x)
      for (var i = n - 1; i; i--) {
        y = fieldAdd(y, coeff[i])
        y = this.field_mult(y, x)
      }
      y = fieldAdd(y, coeff[0])
      return y
    }

    /**
     * @param {Number} n
     * @param {BigNumber[][]} A 2D array
     * @param {BigNumber[]} b 1D array
     */
    P.restore_secret = function (n, AA, b) {
      var i, j, k, found
      var h = new BN(0)
      var t = this

      for (i = 0; i < n; i++) {
        if (!mpz.cmp_ui(AA[i][i], 0)) {
          found = false
          for (j = i + 1; j < n; j++) {
            if (mpz.cmp_ui(AA[i][j], 0)) {
              found = true
              break
            }
          }
          if (!found) {
            return -1
          }
          for (k = i; k < n; k++) {
            AA[k][i] = mpz.swap(AA[k][j], AA[k][j] = AA[k][i])
          }
          b[i] = mpz.swap(b[j], b[j] = b[i])
        }
        for (j = i + 1; j < n; j++) {
          if (mpz.cmp_ui(AA[i][j], 0)) {
            for (k = i + 1; k < n; k++) {
              h = t.field_mult(AA[k][i], AA[i][j])
              AA[k][j] = t.field_mult(AA[k][j], AA[i][i])
              AA[k][j] = fieldAdd(AA[k][j], h)
            }
            h = t.field_mult(b[i], AA[i][j])
            b[j] = t.field_mult(b[j], AA[i][i])
            b[j] = fieldAdd(b[j], h)
          }
        }
      }
      h = t.field_invert(AA[n - 1][n - 1])
      b[n - 1] = t.field_mult(b[n - 1], h)
      return 0
    }

    function pad (num, size, padding) {
      var s = num + ''
      return padding.repeat(size - s.length) + s
    }

    // Prototype / instance methods

    /* field arithmetic routines */
    /* initialize 'poly' to a bitfield representing the coefficients of an
       irreducible polynomial of degree 'deg' */
    function fieldInit (deg) {
      assert(fieldSizeValid(deg))
      var poly = mpz.setbit(0, deg)
      poly = mpz.setbit(poly, irredCoeff[3 * (deg / 8 - 1) + 0])
      poly = mpz.setbit(poly, irredCoeff[3 * (deg / 8 - 1) + 1])
      poly = mpz.setbit(poly, irredCoeff[3 * (deg / 8 - 1) + 2])
      poly = mpz.setbit(poly, 0)
      return poly
    }

    P.field_deinit = function () {
      this.poly = new BN(0)
    }

    /**
     * @param {String} buf The secret to encode
     * @param {String} token An optional text token used to name shares in order to
     * avoid confusion in case one utilizes secret sharing to protect several
     * independent secrets. The generated shares are prefixed by these tokens.
     */
    P.split = function (buf, token) {
      var x
      var y
      var coeff = []
      var i
      var fmtLen // Length of the key index number

      if (token.length > MAXTOKENLEN) { fatal('Token too long') }
      for (fmtLen = 1, i = this.opt_number; i >= 10; i /= 10, fmtLen++);

      var optSecurity
      if (this.opt_hex) {
        optSecurity = 4 * ((buf.length + 1) & ~1)
      } else {
        optSecurity = 8 * buf.length
      }
      if (!fieldSizeValid(optSecurity)) {
        fatal('Security level invalid (secret too long?)')
      }

      this.degree = optSecurity
      this.poly = fieldInit(this.degree)

      coeff[0] = fieldImport(buf, this.opt_hex, this.degree)

      if (this.opt_diffusion) {
        if (this.degree >= 64) {
          coeff[0] = encodeMpz(coeff[0], ENCODE, this.degree)
        } else {
          warning('Security level too small for the diffusion layer. Secret too short.')
        }
      }

      for (i = 1; i < this.opt_threshold; i++) {
        coeff.push(cprngRead(this.degree))
      }

      var keys = []
      for (i = 0; i < this.opt_number; i++) {
        x = new BN(i + 1)
        y = this.horner(this.opt_threshold, x, coeff)
        var key = ''
        if (token) {
          key = token + '-'
        }
        key += pad(i + 1, fmtLen, '0')
        key += '-'
        key += fieldPrint(y, 1, this.degree)
        keys.push(key)
      }

      this.field_deinit()
      return keys
    }

    /* Calculate the secret */

    P.combine = function (shares) {
      var a, b
      var i, j
      var s = 0

      var x

      var y = new Array(this.opt_threshold)

      var A = new Array(this.opt_threshold)
      A.fill(0) // Else forEach is not called for uninitialized elements
      A.forEach(function (v, i, a) {
        a[i] = new Array(this.opt_threshold)
      }, this)

      for (i = 0; i < this.opt_threshold; i++) {
        var parts = shares[i].split('-')
        if (parts.length < 2) {
          fatal('Invalid syntax.')
        }
        a = parts[parts.length - 2]
        b = parts[parts.length - 1]

        if (s === 0) {
          s = 4 * b.length
          if (!fieldSizeValid(s)) {
            fatal('Share has illegal length.')
          }
          this.degree = s
          this.poly = fieldInit(this.degree)
        } else if (s !== 4 * b.length) {
          fatal('Shares have different security levels.')
        }

        j = parseInt(a)
        if (isNaN(j)) fatal('invalid share')
        x = new BN(j)
        A[this.opt_threshold - 1][i] = new BN(1)

        for (j = this.opt_threshold - 2; j >= 0; j--) {
          A[j][i] = this.field_mult(A[j + 1][i], x)
        }
        y[i] = fieldImport(b, 1, this.degree)
        x = this.field_mult(x, A[0][i])
        y[i] = fieldAdd(y[i], x)
      }

      if (this.restore_secret(this.opt_threshold, A, y)) {
        fatal('Shares inconsistent. Perhaps a single share was used twice.')
      }

      if (this.opt_diffusion) {
        if (this.degree >= 64) {
          y[this.opt_threshold - 1] = encodeMpz(y[this.opt_threshold - 1], DECODE, this.degree)
        } else {
          warning('Security level too small for the diffusion layer. Secret too short.')
        }
      }

      var secret = fieldPrint(y[this.opt_threshold - 1], this.opt_hex, this.degree)
      this.field_deinit()
      return secret
    }

      P.processSecret = function (secret) {

	var bip39_dict = {};
	bip39_json.map(function (e) {
	    if (e.length < 4) {
		bip39_dict[e] = e;
	    }
	    else {
		bip39_dict[e.substr(0,4)] = e;
	    }
	});

	var splitSecrets = secret.split(' ');
        var secretMetadata  = splitSecrets[0];
	var secretWOMetadata = secret.replace(secretMetadata+' ', '')
	  
	var ii = secretWOMetadata.split(' ')[0]
	var compressedRawSecret = secretWOMetadata.replace (ii+' ', '')
	var compressedSeedPhrases = compressedRawSecret.match(/(.{1,4})/g);
	compressedSeedPhrases = compressedSeedPhrases.map(function (e) { return bip39_dict[e.trim()];})
	secret = ii + ' ' + compressedSeedPhrases.join(' ');

	return secret
    }
   
    return SSSS
  }

  // Export

  SSSS = constructorFactory()
  SSSS['default'] = SSSS.SSSS = SSSS

  // AMD
  if (typeof define === 'function' && define.amd) {
    define(function () { return SSSS })

  // Node.js and other environments that support module.exports.
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = SSSS

  // Browser
  } else {
    if (!globalObj) globalObj = typeof self !== 'undefined' ? self : Function('return this')() // eslint-disable-line
    globalObj.SSSS = SSSS
  }
})(this)
