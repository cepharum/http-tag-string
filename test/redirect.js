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


describe( "http-tag-string", () => {
	it( "passes redirecting responses by default", () => {
		const HTTP = require( "../" )( "https://google.com" );

		return HTTP`GET /`()
			.then( response => {
				response.should.have.status( 301 );
			} );
	} );

	it( "transparently handles redirecting responses on global demand", () => {
		const HTTP = require( "../" )( "https://google.com", { followRedirects: true } );

		return HTTP`GET /`()
			.then( response => {
				response.should.have.status( 200 );
			} );
	} );

	it( "transparently handles redirecting responses on local demand", () => {
		const HTTP = require( "../" )( "https://google.com" );

		return HTTP`GET /`( null, null, { followRedirects: true } )
			.then( response => {
				response.should.have.status( 200 );
			} );
	} );
} );
