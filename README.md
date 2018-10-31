# HTTP tagged strings

Describe processable HTTP requests using tagged strings.

## License

MIT

## Installation

```bash
npm i -S http-tag-string
``` 

## Usage

```javascript
const HTTP = require( "http-tag-string" )( "http://example.com" );

HTTP`POST /some/url
Content-Type: application/json

{"info":"here it is..."}`
	.then( response => {
		// handle the response ...
		response.json()
			.then( json => {
				// process the returned JSON object ...
			} );
	} );
```
