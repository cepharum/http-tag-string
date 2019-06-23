/**
 * (c) 2018 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

"use strict";

const Path = require( "path" );
const { URL } = require( "url" );
const { Readable } = require( "stream" );
const Http = require( "http" );
const Https = require( "https" );


const ProtocolToLibrary = {
	"http:": Http,
	"https:": Https,
};


/**
 * Creates string tag processing HTTP(S) request bound to provided service URL.
 *
 * @example The following example assumes returned function is assigned to
 *          variable `HTTP`. It is describing POST request to be invoked for
 *          posting some literally provided JSON object and receiving some JSON
 *          object in response.
 *
 *          HTTP`
 *          POST / HTTP/1.0
 *          Content-Type: application/json
 *          ${authenticated ? 'Authorization: Basic <somebase64encodedPairOfCredentials>': ''}
 *          `( { id: 1, value: "the value" } )
 *              .then( response => response.json() )
 *              .then( json => {
 *                  ...
 *              } );
 *
 * @param {string} serviceUrl URL providing scheme, hostname and port of service to be queried
 * @param {boolean} folding controls whether folded lines should be supported or not (must be false to support arbitrary indenting on described HTTP message)
 * @param {boolean} followRedirects set true to implicitly follow responses redirecting to different location
 * @return {function(payload, headers, timeout):Promise<Http.ServerResponse>} tag function customizing request and promising response
 */
module.exports = function( serviceUrl = null, { folding = false, followRedirects = false } = {} ) {
	const baseUrl = new URL( serviceUrl || process.env.HTTP_SERVICE_URL );

	const library = ProtocolToLibrary[baseUrl.protocol];
	if ( !library ) {
		throw new TypeError( "unsupported service protocol " + baseUrl.protocol );
	}

	const { hostname: HOSTNAME, host: HOST, pathname: PREFIX } = baseUrl;

	const colonIndex = HOST.indexOf( ":" );
	const PORT = colonIndex > -1 ? Number( HOST.slice( colonIndex + 1 ) ) : NaN;



	/**
	 * Implements string tagging function.
	 *
	 * @param {string[]} literals literal slices of tagged string
	 * @param {string[]} expressions results of expressions used between literal slices of tagged string
	 * @return {function(payload:*, headers:object):Promise<ServerResponse>} provides function promising response to described HTTP request on invocation
	 */
	const client = function( literals, ...expressions ) {
		// compile slices of tagged string into regular string
		const count = Math.max( literals.length, expressions.length );
		const slices = [ "", "" ];
		let sliceIndex = 0;

		for ( let i = 0; i < count; i++ ) {
			let literal = literals[i];
			const expression = expressions[i];

			if ( sliceIndex < 1 ) {
				const separator = /\r?\n\r?\n/.exec( literal );
				if ( separator ) {
					slices[sliceIndex++] += literal.slice( 0, separator.index );
					literal = literal.slice( separator.index + separator[0].length );
				}
			}

			slices[sliceIndex] += literal != null ? String( literal ) : "";
			slices[sliceIndex] += expression != null ? String( expression ) : "";
		}

		const [ rawHeader, rawBody ] = slices;

		// parse header
		const headerLines = rawHeader.trim().replace( /(\r?\n)+/g, "\n" ).replace( /\n\s+/g, folding ? " " : "\n" ).split( /\n/ );
		const requestLine = headerLines.shift();
		const originalHeaders = {};
		const numHeaderLines = headerLines.length;

		for ( let i = 0; i < numHeaderLines; i++ ) {
			const line = headerLines[i].trim();
			const parsed = /^([^:]+):\s*(.+)$/.exec( line );
			if ( !parsed ) {
				throw new TypeError( `invalid structure of header line "${line}"` );
			}

			const [ , key, value ] = parsed;

			const normalizedKey = key.toLowerCase();
			if ( originalHeaders.hasOwnProperty( normalizedKey ) ) {
				throw new TypeError( `double provision of header "${key}"` );
			}

			originalHeaders[normalizedKey] = value;
		}

		// qualify header
		if ( !originalHeaders.host ) {
			originalHeaders.host = HOSTNAME;
		}

		// parse verb
		const parsedRequestLine = /^\s*(\S+)\s+\/(.*?)(?:\s+HTTP\/\d+\.\d+)?\s*$/.exec( requestLine );
		if ( !parsedRequestLine ) {
			throw new TypeError( "invalid or missing HTTP request line" );
		}

		const [ , VERB, PATH ] = parsedRequestLine;


		return function( payload = null, customHeaders = {}, { timeout = 5000, followRedirects: localFollowRedirects = null } = {} ) {
			const _followRedirects = localFollowRedirects == null ? Boolean( followRedirects ) : Boolean( localFollowRedirects );

			return new Promise( ( resolve, reject ) => {
				const headers = Object.assign( {}, originalHeaders );

				const customHeaderNames = Object.keys( customHeaders || {} );
				const numCustomHeaders = customHeaderNames.length;
				for ( let i = 0; i < numCustomHeaders; i++ ) {
					const name = customHeaderNames[i];

					headers[name.toLowerCase()] = customHeaders[name];
				}

				if ( payload != null ) {
					if ( !Buffer.isBuffer( payload ) && !( payload instanceof Readable ) ) {
						if ( typeof payload === "object" ) {
							payload = Buffer.from( JSON.stringify( payload ), "utf8" );
							if ( !headers.hasOwnProperty( "content-type" ) ) {
								headers["content-type"] = "application/json; charset=utf8";
							}
						} else {
							payload = Buffer.from( String( payload ), "utf8" );
						}
					}
				}

				const requestOptions = {
					method: VERB,
					host: HOSTNAME,
					path: Path.posix.resolve( PREFIX, PATH ),
					headers: Object.assign( {}, headers, { host: HOSTNAME } ),
				};

				if ( timeout > 0 ) {
					requestOptions.timeout = timeout;
				}

				if ( PORT ) {
					requestOptions.port = PORT;
				}

				sendRequest( library, requestOptions );


				function sendRequest( context, options ) {
					const request = context.request( options, response => {
						if ( _followRedirects && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location != null ) {
							if ( payload instanceof Readable ) {
								reject( new Error( "following redirection failed due to streamed request body gone" ) );
								return;
							}

							const schema = context === Https ? "https://" : "http://";
							const target = new URL( response.headers.location, schema + options.host + options.path );

							const subContext = ProtocolToLibrary[target.protocol];
							if ( !subContext ) {
								reject( new Error( "invalid redirection switching to unsupported protocol " + target.protocol ) );
								return;
							}

							const subOptions = {
								method: response.statusCode === 303 ? "GET" : options.method,
								host: target.hostname,
								path: target.pathname,
								headers: Object.assign( {}, options.headers, { host: target.hostname } ),
							};

							if ( parseInt( options.timeout ) > -1 ) {
								subOptions.timeout = options.timeout;
							}

							if ( target.port > 0 ) {
								subOptions.port = target.port;
							}

							sendRequest( subContext, subOptions );
							return;
						}


						let bodyFetcher = null;

						resolve( Object.assign( response, {
							content: getBody,
							json: () => getBody().then( raw => JSON.parse( raw.toString( "utf8" ) ) ),
							text: () => getBody().then( raw => raw.toString( "utf8" ) ),
						} ) );

						/**
						 * Fetches body from current response.
						 *
						 * @returns {Promise<Buffer>} promises body fetched from response
						 */
						function getBody() {
							if ( bodyFetcher == null ) {
								bodyFetcher = new Promise( ( resolve, reject ) => {
									const chunks = [];

									response.on( "data", chunk => chunks.push( chunk ) );
									response.on( "end", () => resolve( Buffer.concat( chunks ) ) );
									response.on( "error", reject );
								} );
							}

							return bodyFetcher;
						}
					} );

					request.on( "error", reject );

					if ( payload != null && options.method !== "GET" && options.method !== "HEAD" ) {
						if ( payload instanceof Readable ) {
							payload.pipe( request );
						} else {
							request.end( payload );
						}
					} else {
						request.end( rawBody || null );
					}
				}
			} );
		};
	};

	/**
	 * Generates value of **Authorization** header used in HTTP requests to pass
	 * basic HTTP authentication.
	 *
	 * @param {string} username name of authenticating user
	 * @param {string} password password of user
	 * @return {string} value for use in **Authorization** header of an HTTP request
	 */
	client.basicAuth = ( username, password ) => "Basic " + Buffer.from( `${username}:${password}` ).toString( "base64" );

	return client;
};
