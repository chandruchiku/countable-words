const fs = require('fs');           // fs to write to filesystem
const request = require('request'); // For http requests.
require('dotenv').config();         //Used for reading environment file.

//Load the dictionary API key from environement file. 
var fileUrl = process.env.FILE_URL;
var apiUrl = process.env.API_URL;
var apiKey = process.env.API_KEY;
var file = 'temp/big.txt';

var finalOutput = [];
//declare a writable 
var writable = fs.createWriteStream(file);

//console.log("FileURL: ", fileUrl);

//using request get the large file and write to a file stream. 
//We can read off directly through stream but 
//this way we can handle network issues and large files
request(fileUrl, function (error, response) {
    if (!error && response.statusCode == 200) {
        console.log('Get File Request success');
    }
    else {
        console.log('Request to GET file failed with error:', error);
    }
}).pipe(writable);;

//After the file is written to disk start
writable.on('finish', function () {
    console.log('Requested file downloaded');

    // read file from current directory
    fs.readFile(file, 'utf8', async function (err, data) {

        if (err) {
            console.log("Failed to read file:", err);
            return;
        }

        //Split all words, create word map and then count and sort.
        var wordsArray = splitByWords(data);
        var wordsMap = createWordMap(wordsArray);
        var finalWordsArray = sortByCount(wordsMap);

        //await untill all requests finish GET. Sending only top 10 elements
        finalOutput = await getDictionaryData(finalWordsArray.slice(0, 10));

        console.log("Final output with meanings for top 10 words");
        console.log('Final Output :', JSON.stringify(finalOutput));
    });
});

async function getDictionaryData(top10words) {
    var promiseArray = [];

    top10words.forEach(word => {
        promiseArray.push(new Promise((resolve, reject) => {
            request(apiUrl + 'key=' + apiKey + '&lang=en-en' + '&text=' + word.name,
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {

                        var wordOutput = {};
                        var respWord = JSON.parse(body);

                        //console.log('Fetch word:', word.name);
                        wordOutput.word = word.name;
                        wordOutput.count = word.count;
                        wordOutput.pos = '';    //Some requests have null pos so init with ''.
                        wordOutput.synonyms = [];

                        //if the def object exists
                        if (respWord.def[0]) {
                            wordOutput.pos = respWord.def[0].pos;
                            respWord.def[0].tr.forEach(translation => {
                                wordOutput.synonyms.push(translation.text);
                            });
                        }

                        //console.log('Push output:', wordOutput);
                        resolve(wordOutput);
                    }
                    else {
                        console.log('Request to read file failed with error:', error);
                        reject();
                    }
                });
        }));
    });

    //run all of them in parallell but wait till all requests finish.
    var result = await Promise.all(promiseArray);

    return result;
}

function splitByWords(text) {
    // split string by spaces (including spaces, tabs, and newlines)
    var wordsArray = text.split(/\s+/);
    return wordsArray;
}

function createWordMap(wordsArray) {

    // create map for word counts
    var wordsMap = {};

    wordsArray.forEach(function (key) {
        if (wordsMap.hasOwnProperty(key)) {
            wordsMap[key]++;
        } else {
            wordsMap[key] = 1;
        }
    });

    return wordsMap;

}

function sortByCount(wordsMap) {

    // sort by count in descending order
    var finalWordsArray = [];
    finalWordsArray = Object.keys(wordsMap).map(function (key) {
        return {
            name: key,
            count: wordsMap[key]
        };
    });

    finalWordsArray.sort(function (a, b) {
        return b.count - a.count;
    });

    return finalWordsArray;

}
