/**
 * (c) 2019 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2019 cepharum GmbH
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

const { describe, it } = require( "mocha" );
require( "should" );
require( "should-http" );


describe( "http-tag-string exports generator which", () => {
	it( "is a function", () => {
		require( "../" ).should.be.Function();
	} );

	it( "cannot be invoked without argument", () => {
		( () => require( "../" )() ).should.throw();
	} );

	it( "requires provision of URL selecting supported scheme", () => {
		( () => require( "../" )( "http://localhost" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost" ) ).should.not.throw();
	} );

	it( "rejects provision of URL selecting non-supported scheme", () => {
		( () => require( "../" )( "ftp://localhost" ) ).should.throw();
		( () => require( "../" )( "ftps://localhost" ) ).should.throw();
	} );

	it( "accepts provision of URL selecting particular port as number", () => {
		( () => require( "../" )( "http://localhost:80" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost:443" ) ).should.not.throw();
		( () => require( "../" )( "http://localhost:443" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost:80" ) ).should.not.throw();
		( () => require( "../" )( "http://localhost:1" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost:65535" ) ).should.not.throw();
	} );

	it( "accepts provision of URL selecting path as prefix", () => {
		( () => require( "../" )( "http://localhost/" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost/" ) ).should.not.throw();
		( () => require( "../" )( "http://localhost/simple" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost/simple" ) ).should.not.throw();
		( () => require( "../" )( "http://localhost/simple/" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost/simple/" ) ).should.not.throw();
		( () => require( "../" )( "http://localhost/some/deep/prefix" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost/some/deep/prefix" ) ).should.not.throw();
		( () => require( "../" )( "http://localhost/some/deep/prefix/" ) ).should.not.throw();
		( () => require( "../" )( "https://localhost/some/deep/prefix/" ) ).should.not.throw();
	} );

	it( "rejects provision of URL lacking hostname", () => {
		( () => require( "../" )( "http://" ) ).should.throw();
		( () => require( "../" )( "https://" ) ).should.throw();
		( () => require( "../" )( "http:///" ) ).should.throw();
		( () => require( "../" )( "https:///" ) ).should.throw();
	} );

	it( "rejects provision of relative URL", () => {
		( () => require( "../" )( "test" ) ).should.throw();
		( () => require( "../" )( "./test" ) ).should.throw();
		( () => require( "../" )( "../test" ) ).should.throw();
	} );

	describe( "returns a function which", () => {
		it( "is a function", () => {
			require( "../" )( "http://localhost/" ).should.be.Function();
		} );

		it( "can be used for tagging string containing fragment of HTTP request header", () => {
			const Func = require( "../" )( "http://localhost/" );

			( () => Func`GET / HTTP/1.0` ).should.not.throw();
			( () => Func`GET /          HTTP/1.0` ).should.not.throw();
			( () => Func`GET /` ).should.not.throw();
			( () => Func`GET    /` ).should.not.throw();
			( () => Func`      GET    /  ` ).should.not.throw();
		} );

		it( "can't be used for tagging any string", () => {
			const Func = require( "../" )( "http://localhost/" );

			( () => Func`` ).should.throw();
			( () => Func`something` ).should.throw();
			( () => Func`/` ).should.throw();
		} );

		describe( "returns a function when used for tagging string which", () => {
			const Defunct = require( "../" )( "https://cepharum.de:65432/" );
			const Funct = require( "../" )( "https://google.com/" );

			it( "is a function", () => {
				Defunct`GET /`.should.be.Function();
			} );

			describe( "returns Promise which", () => {
				it( "is a Promise", () => {
					const p = Defunct`GET /`();

					p.should.be.Promise();

					return p.catch( e => {} );
				} );

				it( "is rejected due to base URL provided before selecting some missing server", () => {
					return Defunct`GET /`().should.be.Promise().which.is.rejected()
						.catch( error => {
							error.should.be.instanceOf( Error );
						} );
				} );

				it( "is resolved when using base URL selecting existing server", () => {
					return Funct`GET /`().should.be.Promise().which.is.resolved()
						.then( response => {
							response.should.be.Object();
							response.should.have.property( "statusCode" ).which.is.a.Number().which.is.greaterThanOrEqual( 100 );
						} );
				} );

				it( "is resolved when using base URL selecting existing server but providing request not supported by server", () => {
					return Funct`GET /this/is/a/request/path/hopefully/not/supported/by/Google`().should.be.Promise().which.is.resolved()
						.then( response => {
							response.should.be.Object();
							response.should.have.property( "statusCode" ).which.is.a.Number().which.is.greaterThanOrEqual( 400 ).and.is.lessThan( 500 );
						} );
				} );

				describe( "is resolved with object which", () => {
					it( "is promising response body via method `content`", () => {
						return Funct`GET /`()
							.then( response => {
								response.should.have.property( "content" ).which.is.a.Function();
								response.content().should.be.Promise().which.is.resolved();

								return response.content().then( buffer => {
									buffer.should.be.instanceOf( Buffer );
									buffer.should.have.property( "length" ).which.is.greaterThan( 0 );
									buffer.toString( "utf8" ).should.match( /<body/i );
								} );
							} );
					} );

					it( "is promising response body as string via method `text`", () => {
						return Funct`GET /`()
							.then( response => {
								response.should.have.property( "text" ).which.is.a.Function();
								response.text().should.be.Promise().which.is.resolved();

								return response.text().then( text => {
									text.should.be.String().which.is.not.empty();
									text.should.match( /<body/i );
								} );
							} );
					} );

					it( "is promising JSON-formatted response body as object via method `json`", () => {
						const API = require( "../" )( "http://ip.jsontest.com/" );

						return API`GET /`()
							.then( response => {
								response.should.have.property( "json" ).which.is.a.Function();
								response.json().should.be.Promise();

								return response.json().should.be.resolved()
									.then( data => {
										data.should.be.Object().which.is.not.empty();
									} );
							} );
					} );

					it( "fails promising JSON-formatted response body as object via method `json` on a non-JSON response", () => {
						return Funct`GET /`()
							.then( response => {
								response.should.have.property( "json" ).which.is.a.Function();

								return response.json().should.be.Promise().which.is.rejected();
							} );
					} );
				} );
			} );
		} );
	} );
} );
