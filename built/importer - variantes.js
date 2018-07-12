"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const parse = require("csv-parse");
const Parse = require("parse/node");
const fs = require("fs");
const rp = require("request-promise");
const sharp = require("sharp");
const Model = require("omnichat-model");
// Program autopeças
const retailerId = 'PkL7fKmWuE';
const csvfile = '/Users/flaviotorres/Downloads/program-new.csv';
const DEFINITION1 = 'Tamanho'; //"Tamanho"
const DEFINITION2 = 'Cor'; //"Cor"
const productsCache = [];
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
let variation1Column = -1;
let variation2Column = -1;
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
        if (columnName.toLowerCase() === 'nome do produto') {
            nameColumn = column;
        }
        else if (columnName.toLowerCase() === 'preço') {
            priceColumn = column;
        }
        else if (columnName.toLowerCase() === 'preço promoção') {
            salePriceColumn = column;
        }
        else if (columnName.toLowerCase() === 'variação 1') {
            variation1Column = column;
        }
        else if (columnName.toLowerCase() === 'variação 2') {
            variation2Column = column;
        }
        else if (columnName.toLowerCase() === 'referência') {
            referenceColumn = column;
        }
        else if (columnName.toLowerCase() === 'descrição') {
            descriptionColumn = column;
        }
        else if (columnName.toLowerCase() === 'url da foto') {
            imageColumn = column;
        }
        else if (columnName.toLowerCase() === 'altura') {
            heightColumn = column;
        }
        else if (columnName.toLowerCase() === 'comprimento') {
            lengthColumn = column;
        }
        else if (columnName.toLowerCase() === 'largura') {
            widthColumn = column;
        }
        else if (columnName.toLowerCase() === 'peso') {
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
function addProduct(csvProduct) {
    return __awaiter(this, void 0, void 0, function* () {
        let filePromise;
        let images;
        if (imageColumn >= 0) {
            let fileUrl = csvProduct[imageColumn];
            if (fileUrl && fileUrl.length > 0) {
                filePromise = rp({
                    uri: fileUrl,
                    encoding: null,
                });
            }
            else {
                filePromise = Parse.Promise.as(undefined);
            }
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
                return Parse.Promise.as({});
            }
        }, (error) => {
            console.error('Não consegui baixar a foto');
            console.error(csvProduct[0] + " - " + csvProduct[6]);
            return Parse.Promise.as({});
        })
            .then(result => {
            images = result;
            return productWithName(csvProduct[nameColumn]);
        })
            .then((product) => {
            product.productDescription = csvProduct[descriptionColumn];
            product.retailer = retailer;
            product.blocked = false;
            product.definition1 = DEFINITION1;
            product.definition2 = DEFINITION2;
            const variant = new Variant({
                // price: parseFloatBR(csvProduct[priceColumn]),
                price: Number(csvProduct[priceColumn]),
                definition1Value: csvProduct[variation1Column],
                definition2Value: csvProduct[variation2Column],
                erpId: csvProduct[referenceColumn],
                weight: Number(csvProduct[weigthColumn]),
                length: Number(csvProduct[lengthColumn]),
                height: Number(csvProduct[heightColumn]),
                width: Number(csvProduct[widthColumn])
            });
            if (images) {
                variant.set('image', images.mainImageFile);
                variant.set('thumbnail', images.thumbnailImageFile);
            }
            const salePrice = parseFloatBR(csvProduct[salePriceColumn]);
            if (salePrice) {
                variant.set('salePrice', salePrice);
            }
            product.variants.push(variant);
            if (!product.mainVariant) {
                product.mainVariant = variant;
            }
            return cacheAndSave(product);
        }, error => {
            console.error(`error: ${error}`);
        });
    });
}
function cacheAndSave(product) {
    productsCache.push(product);
    return product.save(null, { useMasterKey: true });
    // const cacheMaxLength = 1
    // productsCache.push(product)
    // let promise;
    // if (productsCache.length >= cacheMaxLength) {
    //   const products = productsCache.splice(0)
    //   console.log(`Saving batch(${cacheMaxLength}) of products...`)
    //   promise = Parse.Object.saveAll(products, { useMasterKey: true })
    // } else {
    //   promise = Promise.resolve()
    // }
    // return promise;
}
function productWithName(name) {
    return __awaiter(this, void 0, void 0, function* () {
        let product = productsCache.find(product => product.get('name') === name);
        if (!product) {
            const query = new Parse.Query(Model.Product);
            query.equalTo('name', name);
            product = yield query.first({ useMasterKey: true });
        }
        if (!product) {
            product = new Model.Product();
            product.name = name;
            product.variants = [];
        }
        return product;
    });
}
const parseOptions = {
    delimiter: ','
};
// fs.createReadStream(__dirname + '/galpao.csv', { encoding: 'utf8' }).pipe(parser);
const stream = fs.createReadStream(csvfile, { encoding: 'utf8' });
var parser = parse({ delimiter: ',' });
let line = 0;
let counter = 0;
parser.on('data', function (data) {
    console.log('More data');
    parser.pause();
    if (line === 0) {
        discoverColumns(data);
        parser.resume();
    }
    else {
        addProduct(data).then(() => {
            console.log(`Product added to cache - ${counter++}`);
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
    //Parse.Object.saveAll(productsCache, { useMasterKey: true })
    console.log('finish');
});
stream.pipe(parser);
//# sourceMappingURL=importer - variantes.js.map