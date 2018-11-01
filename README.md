# HTTP tagged strings

Describe processable HTTP requests using tagged strings.

## License

MIT

## Installation

```bash
npm i -S http-tag-string
``` 

## Examples

Provide a full HTTP request message:

```javascript
const HTTP = require( "http-tag-string" )( "http://example.com" );

HTTP`POST /some/url
Content-Type: application/json

{"info":"here it is..."}`()
	.then( response => {
		// handle the response ...
		return response.json();
	} )
	.then( json => {
		// process the returned JSON object ...
	} );
```

Provide the payload separately:

```javascript
const HTTP = require( "http-tag-string" )( "http://example.com" );

const data = {
	info: "here it is...",
};

HTTP`POST /some/url
Content-Type: application/json`( data )
	.then( response => {
		// handle the response ...
		return response.json();
	} )
	.then( plainText => {
		// process some returned plain text string ...
	} );
```

Provide the payload as a readable stream:

```javascript
const File = require( "fs" );
const HTTP = require( "http-tag-string" )( "http://example.com" );

HTTP`POST /some/url
Content-Type: application/json`( File.createReadStream( "/some/file.json" ) )
	.then( response => {
		// handle the response ...
		return response.content();
	} )
	.then( buffer => {
		// process some returned raw body Buffer ...
	} );
```
