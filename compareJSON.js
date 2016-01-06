///////////////////////////////////////////////////
//--------------- compareJSON.js ----------------//
// Pupose: Compares N sets of JSON files for "sameness".
// Usage:  node compareJSON.js file1L file1R file2L file2R fileNL fileNR
// Notes: 1) Automatically ignores case for object key names.
//        2) Optionally ignores case for STRING values (TO ADD, but easy to do)
//        3) Automatically Ignores case for Hexadecimal values, i.e. 0xa vs 0xA
// File Input:
//        1) the files can be from any path, local or external
//        2) The file names can include and extension or not, i.e. file.json or file.
//        3) The test case name is taken from the fileNL (left file) for each test
// Save Path:
//        1) the save path will be the directory of the first input file

const MIN_NUM_ARG = 4;	// require 2 command arguments plus, at least 2 file arguments
// text used for prefix to pass/fail test cases in output
const FAIL_TEXT   = "fail";
const PASS_TEXT   = "good";
const FAIL_FILE	  = "Fail";
const PASS_FILE   = "Pass";
const FILE_EXT    = ".json";
const USAGE 	  = 'Usage: node compareJSON.js file1L file2R ... fileNL fileNR';

// the path to which the test result file will be saved
var savePath;

// This is for outputting the data to an web server for display
var useServer = false;

// needed for reading a file
var fs = require('fs');

//------------- Test Case Object -------------//
// the object that contains the files to be tested and the test key name
var globFileObj = new Object();

//------------- Initialize Result Data -------------//
var resultObj = new Object();	// the result object
resultObj["count"] = 0;
resultObj["error"] = 0;
resultObj["fail"]  = 0;
resultObj["pass"]  = 0;
resultObj["rslt"]  = 0;
var testResult  = [];			// array of individual test results
var resultArray = [];			// complete result array
var PASS = 0;
var FAIL = 0;
 
//---------- Verify Command Arguments ----------//
if (process.argv.length < MIN_NUM_ARG)
{
	console.error('Not enough command arguments');
	console.error(USAGE);
	updateFinalResults(1);
	process.exit(1);	 
}

//--------- extract the save path ---------//
var file1  = process.argv[2];
var endIdx = file1.lastIndexOf("\\") + 1;
savePath   = file1.substring(0, endIdx);

//---------- Verify Even Number of Files For Comparison ----------//
if ( (process.argv.length % 2) > 0)
{
	console.error('Unevern number of file arguments.');
	console.error(USAGE);
	updateFinalResults(1);
	writeResultToFile();
	process.exit(1);	 	
}

console.log('------ Comparing JSON Files ------');

//-------- Delete any prexisting result files --------//
deleteFile(savePath + FAIL_FILE);
deleteFile(savePath + PASS_FILE);

//----- compute the number of tests, and number of files -----//
var numTests = (process.argv.length - 2) / 2;
var numFiles = numTests*2;

resultObj["count"] = numTests;

if (useServer)
{
	console.log('Server running at http://192.168.0.155:1337/');
}

//--------- Extract all of the test cases ---------//
for (var i=0; i<numFiles; i+=2)
{
	var argIdx = i + 2;
	var fileLeft  = process.argv[argIdx];
	var fileRight = process.argv[argIdx+1];
	
	extractTestCase(fileLeft, fileRight);	
}

//--------- Iterate through the tests cases ---------//
Object.keys(globFileObj).forEach
( 
	function(test)
	{
		console.log('--- Testing: ', test);
		
		// read in the JSON Text to an Object
		var jsonLeft  = readJsonFile( globFileObj[test][0] );
		var jsonRight = readJsonFile( globFileObj[test][1] );
		
		// Convert the Keys in the Nested JSON Object to lower case
		setJSONKeysToLowerCase(jsonLeft);
		setJSONKeysToLowerCase(jsonRight);
		
		// stringify the object
		var jsonL_str = JSON.stringify(jsonLeft);
		var jsonR_str = JSON.stringify(jsonRight);
		
		// run the test, comparing the 2 sets of JSON text
		var result = FAIL_TEXT + test;
		if (jsonL_str === jsonR_str)
		{
			result = PASS_TEXT + test;
			PASS += 1;
		}
		else
		{
			result = FAIL_TEXT + test;
			FAIL += 1;
		}
		
		console.log("----- result: ", result);	
		
		// update the result array
		resultArray.push(result);
		
	}
);

//------------ Update the Final Result JSON Text --------------//
updateFinalResults(0);

//------------ Write the Result to a File -------------//
writeResultToFile();

if (useServer)
{
	var http = require('http');

	var server = http.createServer
	(
		function (req, res) 
		{
		  res.writeHead(200, {'Content-Type': 'text/plain'});
		  res.end(testResultStr);
		}
	);
	server.listen(1337, '192.168.0.155');
}


//////////////////////////////////////////////////////////
//--------------------- Functions ----------------------//
//////////////////////////////////////////////////////////

//------------------- deleteFile ---------------------//
function deleteFile(file)
{
	try
	{
		fs.statSync( file );	
		fs.unlinkSync(file);		
	}
	catch(e)
	{
		// don't need to do anything here
	}
}

//------------------- writeResultToFile ---------------------//
function writeResultToFile()
{
	var testResultStr = JSON.stringify(testResult);

	var resultFile = savePath;
	if ( FAIL > 0) 
	{
		resultFile += FAIL_FILE;
	}
	else
	{
		resultFile += PASS_FILE;
	}

	fs.writeFile( resultFile, testResultStr, 
		function(error) 
		{
			if (error)
			{			
				throw error;
			}
			console.log("Saved result to: ", resultFile );
		}
	);		
}

//------------------- updateFinalResults ---------------------//
function updateFinalResults(error)
{
	if (error > 0)
	{
		resultObj["error"] = 1;	
		testResult.push(resultObj);
	}
	else
	{
		resultObj["fail"]  = FAIL;
		resultObj["pass"]  = PASS;	
		testResult.push(resultObj);
		for (var i=0; i<resultArray.length; ++i)
		{
			testResult.push( resultArray[i] );
		}	
	}

	console.log(testResult);		
}

//------------------- extractTestCase ---------------------//
function extractTestCase(fileL, fileR)
{
	var startIdx  = fileL.lastIndexOf("\\") + 1;
	var endIdx    = fileL.lastIndexOf(".");
	if (endIdx === -1)
	{
		endIdx = fileL.length;
		// add the file extensions, if they weren't included
		fileL += FILE_EXT;
		fileR += FILE_EXT;
	}		
	
	var testName = fileL.substring(startIdx, endIdx);

	globFileObj[testName] = [fileL, fileR];	
}

//------------------- setJSONKeysToLowerCase ---------------------//
// recursively set key values to lowerCase in the nested object
function setJSONKeysToLowerCase( jsonObj ) 
{
	var lastType = "";
    Object.keys(jsonObj).forEach
	(
		function (key) 
		{
			// delete and replace all keys with lower-case versions despite case, so as to preserve order
			var kLC  = key.toLowerCase();
			var temp = jsonObj[key];
			delete( jsonObj[key] );
			jsonObj[kLC] = temp;
			
			// make HEX values all lower case 
			if (kLC == "val")
			{
				if (lastType === "HEX")
				{
					var hLC = jsonObj[kLC].toLowerCase();
					jsonObj[kLC] = hLC;					
				}				
			}			
			
			// determine the last type to identify values associated with HEX keys
			if (kLC == "type")
			{	
				lastType = jsonObj[kLC];
			}
			
			if (typeof(jsonObj[kLC]) === 'object') 
			{
				return setJSONKeysToLowerCase(jsonObj[kLC]);
			}
		}
	);
}

//------------------- readJsonFile ---------------------//
function readJsonFile( fileName )
{
	// must be done synchronously so argument can be returned
	var jsonObj = JSON.parse( fs.readFileSync(fileName, 'utf8') );
	
	return jsonObj;
}
