'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const parse = require('csv-parse');
const Parse = require("parse/node");
const fs = require('fs');
const rp = require('request-promise');
const sharp = require('sharp');
// King Temaki
// const retailerId = 'D09hESGOMs';
// const csvfile = '/Users/flavio/Downloads/king.csv';
// if (process.argv.length < 4) {
//   console.log('node importer.js <retailer.objectId> <products.csv>');
//   process.exit(1);
// }
// Seduc Centro
// const retailerId = 'SxtOQAn3F8';
// Seduc HQ
// const retailerId = 'HEeERhRFfl'; 
// const csvfile = '/Users/flaviotorres/Downloads/seduc.csv';
// MD
// const retailerId = '70E2Cokcmh'; 
// const csvfile = '/Users/flaviotorres/Downloads/md.csv';
// Vinçon casa
// const retailerId = 'EOv4ypdVyF';
// const csvfile = '/Users/flaviotorres/Downloads/Untitled spreadsheet - Sheet.csv';
// Galpão autopeças
// const retailerId = '6uaSBRitGY'
// const csvfile = '/Users/flaviotorres/Downloads/galpao.csv';
// Galpão autopeças
const retailerId = 'qKJMDKuito';
const csvfile = '/Users/flaviotorres/Downloads/decor.csv';
// Herbalife
// const retailerId = 'yJkpWRoLrg';
// const retailerId = 'duXxt756IQ';
// const retailerId = 'Lk7bIlVQHR';
//const retailerId = 'XUuWCI2hWc'; //Debora
// const retailerId = '7YYygCfRES'; //Deisy e Piero - Consultores Herbalife
// const csvfile = '/Users/flavio/Dropbox/Sharing/OmniChat-Comercial/Clientes/Herbalife/lista-de-preços.csv';
// // Seduc Camburiu
// const retailerId = 'WqM3E2qBWv';
// const csvfile = '/Users/flavio/Dropbox/Sharing/OmniChat-Comercial/Clientes/Seduc-Intec-Balneario/cursos-para-importar.csv';
// Seduc Camburiu
// const retailerId = '1SbaahA2l8';
// const csvfile = '/Users/flavio/Downloads/seduc-paranagua.csv';
/*
 * We must have the application key + javasript key
 * as we are saving objects back to Parse
 * via Javascript SDK
*/
if (!process.env.PARSE_APP_ID ||
    !process.env.PARSE_JAVASCRIPT_KEY ||
    !process.env.PARSE_MASTER_KEY) {
    console.log(`PARSE_APP_ID = ${process.env.PARSE_APP_ID}`);
    console.log('PARSE_JAVASCRIPT_KEY = ${process.env.PARSE_JAVASCRIPT_KEY}');
    console.log('PARSE_MASTER_KEY = ${process.env.PARSE_MASTER_KEY}');
    console.error('*** WARNING *** Parse Environment variables are not set!');
    process.exit(0);
}
else {
    Parse.initialize(process.env.PARSE_APP_ID, // application key
    process.env.PARSE_JAVASCRIPT_KEY, // javasript key
    process.env.PARSE_MASTER_KEY // master key
    );
    Parse.serverURL = process.env.PARSE_SERVER_URL;
}
const Product = Parse.Object.extend('Product');
const Variant = Parse.Object.extend('Variant');
const Retailer = Parse.Object.extend('Retailer');
const retailer = new Retailer();
retailer.id = retailerId;
let nameColumn = -1;
let priceColumn = -1;
let salePriceColumn = -1;
let variationColumn = -1;
let descriptionColumn = -1;
let referenceColumn = -1;
let imageColumn = -1;
let heightColumn = -1;
let lengthColumn = -1;
let widthColumn = -1;
let weigthColumn = -1;
function parseFloatBR(string) {
    if (string === undefined || string.length === 0) {
        return undefined;
    }
    let formatedString = string.replace('.', '');
    formatedString = formatedString.replace(',', '.');
    return parseFloat(formatedString);
}
function discoverColumns(firstColumn) {
    const retailer = new Retailer();
    retailer.id = retailerId;
    for (let column = 0; column < firstColumn.length; column++) {
        const columnName = firstColumn[column];
        if (columnName.toLowerCase() === 'name') {
            nameColumn = column;
        }
        else if (columnName.toLowerCase() === 'price') {
            priceColumn = column;
        }
        else if (columnName.toLowerCase() === 'saleprice') {
            salePriceColumn = column;
        }
        else if (columnName.toLowerCase() === 'variation') {
            variationColumn = column;
        }
        else if (columnName.toLowerCase() === 'reference') {
            referenceColumn = column;
        }
        else if (columnName.toLowerCase() === 'description') {
            descriptionColumn = column;
        }
        else if (columnName.toLowerCase() === 'image_url') {
            imageColumn = column;
        }
        else if (columnName.toLowerCase() === 'height') {
            heightColumn = column;
        }
        else if (columnName.toLowerCase() === 'length') {
            lengthColumn = column;
        }
        else if (columnName.toLowerCase() === 'width') {
            widthColumn = column;
        }
        else if (columnName.toLowerCase() === 'weigth') {
            weigthColumn = column;
        }
        else {
            console.log(`Coluna "${columnName}" desconhecida"`);
            process.exit(1);
        }
    }
    if (nameColumn === -1 || priceColumn === -1 || referenceColumn === -1) {
        return Parse.Promise.error('Faltando coluna mandatória');
    }
}
let count = 1;
function addProduct(csvProduct) {
    console.log(`adding produtct ${count++} - ${csvProduct}`);
    let filePromise;
    if (imageColumn >= 0) {
        let fileUrl = csvProduct[imageColumn];
        // fileUrl = fileUrl.replace('https://', '');
        // fileUrl = `https://${escape(fileUrl)}`;
        filePromise = rp({
            uri: fileUrl,
            encoding: null
        });
    }
    else {
        filePromise = Parse.Promise.as(undefined);
    }
    return filePromise.then((image) => {
        if (image) {
            let mainImageFile;
            let thumbnailImageFile;
            mainImageFile = new Parse.File("image.jpg", Array.from(image));
            return mainImageFile.save()
                .then(() => sharp(image).resize(64).toBuffer())
                .then(function (result) {
                thumbnailImageFile = new Parse.File("thumbnail.jpg", Array.from(result));
                return thumbnailImageFile.save();
            })
                .then(() => Parse.Promise.as({ mainImageFile, thumbnailImageFile }));
        }
        else {
            return Parse.Promise.as(undefined);
        }
    }, (error) => {
        console.error('Não consegui baixar a foto');
        console.error(csvProduct[0] + " - " + csvProduct[6]);
        return Parse.Promise.as(undefined);
    })
        .then((images) => {
        const variant = new Variant({
            price: parseFloatBR(csvProduct[priceColumn]),
            // definition1Value: csvProduct[variationColumn],
            erpId: csvProduct[referenceColumn],
            weight: parseFloatBR(csvProduct[weigthColumn]),
            length: parseFloatBR(csvProduct[lengthColumn]),
            height: parseFloatBR(csvProduct[heightColumn]),
            width: parseFloatBR(csvProduct[widthColumn])
        });
        if (images) {
            variant.set('image', images.mainImageFile);
            variant.set('thumbnail', images.thumbnailImageFile);
        }
        const salePrice = parseFloatBR(csvProduct[salePriceColumn]);
        if (salePrice) {
            variant.set('salePrice', salePrice);
        }
        //   return variant.save(null, { useMasterKey: true });
        // }).then((variant) => {
        const product = new Product({
            name: csvProduct[nameColumn],
            productDescription: csvProduct[descriptionColumn],
            retailer,
            mainVariant: variant,
            blocked: false,
            variants: [variant],
        });
        return cacheAndSave(product);
    }, error => {
        console.error(`error: ${error}`);
    });
}
const productsCache = [];
function cacheAndSave(product) {
    const cacheMaxLength = 250;
    productsCache.push(product);
    let promise;
    if (productsCache.length >= cacheMaxLength) {
        const products = productsCache.splice(0);
        console.log(`Saving batch(${cacheMaxLength}) of products...`);
        promise = Parse.Object.saveAll(products, { useMasterKey: true });
    }
    else {
        promise = Promise.resolve();
    }
    return promise;
}
const parseOptions = {
    delimiter: ','
};
// fs.createReadStream(__dirname + '/galpao.csv', { encoding: 'utf8' }).pipe(parser);
const stream = fs.createReadStream(__dirname + '/decor.csv', { encoding: 'utf8' });
var parser = parse({ delimiter: ',' });
let line = 0;
parser.on('data', function (data) {
    console.log('More data');
    parser.pause();
    if (line === 0) {
        discoverColumns(data);
        parser.resume();
    }
    else {
        addProduct(data).then(() => {
            parser.resume();
        }, error => {
            console.error(error);
        });
    }
    line++;
});
// Catch any error
parser.on('error', function (err) {
    console.log(err.message);
});
// When we are done, test that the parsed output matched what expected
parser.on('finish', function () {
    console.log('finish');
});
stream.pipe(parser);
//# sourceMappingURL=importer.js.map