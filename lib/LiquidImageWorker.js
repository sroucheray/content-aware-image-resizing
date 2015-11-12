function isLittleEndian() {
    var b = new ArrayBuffer(4);
    var a = new Uint32Array(b);
    var c = new Uint8Array(b);
    a[0] = 0xdeadbeef;
    if (c[0] == 0xef) return true;
    if (c[0] == 0xde) return false;
    throw new Error('Unknown endianness');
}


var PixelUtils = {};

if (isLittleEndian()) {
    PixelUtils.toRGBA = function(uint) {
        return {
            r: uint & 0xFF,
            g: uint >> 8 & 0xFF,
            b: uint >> 16 & 0xFF,
            a: uint >> 24 & 0xFF
        };
    };

    PixelUtils.toUint = function(pixel) {
        return (pixel.a << 24) | (pixel.b << 16) | (pixel.g << 8) | (pixel.r);
    };
} else {

    PixelUtils.toRGBA = function(uint) {
        return {
            r: uint >> 24 & 0xFF,
            g: uint >> 16 & 0xFF,
            b: uint >> 8 & 0xFF,
            a: uint & 0xFF
        };
    };

    PixelUtils.toUint = function(pixel) {
        return (pixel.r << 24) | (pixel.g << 16) | (pixel.b << 8) | (pixel.a);
    };
}


PixelUtils.clamp = function(pixel) {
    pixel.r = Math.max(Math.min(pixel.r, 255), 0);
    pixel.g = Math.max(Math.min(pixel.g, 255), 0);
    pixel.b = Math.max(Math.min(pixel.b, 255), 0);
    pixel.a = Math.max(Math.min(pixel.a, 255), 0);

    return pixel;
};

self.onmessage = function(event) {
    if (event.data.command === 'process') {
        var imageBuffer = new ImageBuffer(
            event.data.imageData.data.buffer,
            event.data.imageData.width,
            event.data.imageData.height
        );
        var i = 100;
        while(i--) {
            //console.log(">1", imageBuffer.imageArray.length, imageBuffer.imageArray.buffer.byteLength)
            var carvedImageClone = imageBuffer.clone();

            //console.log(">2", carvedImageClone.imageArray.length, carvedImageClone.imageArray.buffer.byteLength)
            var processor = new ImageProcessor();
            processor.forEachPixelSelf(imageBuffer, processor.energy());


            var seam = processor.seamCarving(imageBuffer);
            processor.stripSeam(carvedImageClone, seam);
            //console.log(">3", carvedImageClone.imageArray.length, carvedImageClone.imageArray.buffer.byteLength)

            self.postMessage({
                command: 'energy',
                width: imageBuffer.width,
                height: imageBuffer.height,
                imageData: imageBuffer.imageArray.buffer
            }, [imageBuffer.imageArray.buffer]);

            imageBuffer = carvedImageClone.clone();

            self.postMessage({
                command: 'seam',
                width: carvedImageClone.width,
                height: carvedImageClone.height,
                imageData: carvedImageClone.imageArray.buffer
            }, [carvedImageClone.imageArray.buffer]);
        }

    }
};



var ImageBuffer = function(buffer, width, height) {

/*    var newBuffer = new ArrayBuffer(buffer.byteLength);
    this.imageArray = new Uint32Array(newBuffer);
    this.imageArray.set(new Uint32Array(buffer));*/
    this.setBuffer(buffer);

    this.width = width;
    this.height = height;
};

ImageBuffer.prototype.clone = function() {
    var src = this.imageArray.buffer;
    var newBuffer = new ArrayBuffer(src.byteLength);
    new Uint32Array(newBuffer).set(new Uint32Array(src));

    return new ImageBuffer(newBuffer, this.width, this.height);
};

ImageBuffer.prototype.setBuffer = function(buffer) {
    var newBuffer = new ArrayBuffer(buffer.byteLength);
    this.imageArray = new Uint32Array(newBuffer);
    this.imageArray.set(new Uint32Array(buffer));
};

ImageBuffer.prototype.pixelPos = function(x, y) {
    if (x < 0) {
        x = 0;
    } else if (x >= this.width) {
        x = this.width - 1;
    }

    if (y < 0) {
        y = 0;
    } else if (y >= this.height) {
        y = this.height - 1;
    }

    return y * this.width + x;
};

ImageBuffer.prototype.getPixel32 = function(x, y) {
    return this.imageArray[this.pixelPos(x, y)];
};

ImageBuffer.prototype.getPixel = function(x, y) {
    return PixelUtils.toRGBA(this.getPixel32(x, y));
};

ImageBuffer.prototype.getLeftPixel = function(x, y) {
    return this.getPixel32(x - 1, y);
};

ImageBuffer.prototype.getRightPixel = function(x, y) {
    return this.getPixel32(x + 1, y);
};

ImageBuffer.prototype.getTopPixel = function(x, y) {
    return this.getPixel32(x, y - 1);
};

ImageBuffer.prototype.getBottomPixel = function(x, y) {
    return this.getPixel32(x, y + 1);
};

ImageBuffer.prototype.getTopLeftPixel = function(x, y) {
    return this.getPixel32(x - 1, y - 1);
};

ImageBuffer.prototype.getTopRightPixel = function(x, y) {
    return this.getPixel32(x + 1, y - 1);
};

ImageBuffer.prototype.getBottomLeftPixel = function(x, y) {
    return this.getPixel32(x - 1, y + 1);
};

ImageBuffer.prototype.getBottomRightPixel = function(x, y) {
    return this.getPixel32(x + 1, y + 1);
};

ImageBuffer.prototype.setPixel32 = function(x, y, pixel) {
    this.imageArray[this.pixelPos(x, y)] = pixel;
};

ImageBuffer.prototype.setPixel = function(x, y, pixel) {
    this.setPixel32(x, y, PixelUtils.toUint(pixel));
};



var ImageProcessor = function(/*imageData*/) {
    //this.imageData = imageData;
/*    this.width = imageData.width;
    this.height = imageData.height;

    this.setBuffer(imageData.data.buffer);*/

    this.processStack = [];
};

ImageProcessor.prototype.setBuffer = function(buffer) {
    this.imageArrayBuffer = new Uint32Array(buffer);
    //this.originalUintArrayBuffer = new Uint32Array(buffer);
};




/*ImageProcessor.prototype.pixelPos = function(x, y) {
    if (x < 0) {
        x = 0;
    } else if (x >= this.width) {
        x = this.width - 1;
    }

    if (y < 0) {
        y = 0;
    } else if (y >= this.height) {
        y = this.height - 1;
    }

    return y * this.width + x;
};*/

/*ImageProcessor.prototype.getPixel32 = function(x, y) {
    return this.imageArrayBuffer[this.pixelPos(x, y)];
};

ImageProcessor.prototype.getPixel = function(x, y) {
    return PixelUtils.toRGBA(this.getPixel32(x, y));
};

ImageProcessor.prototype.getLeftPixel = function(x, y) {
    return this.getPixel32(x - 1, y);
};

ImageProcessor.prototype.getRightPixel = function(x, y) {
    return this.getPixel32(x + 1, y);
};

ImageProcessor.prototype.getTopPixel = function(x, y) {
    return this.getPixel32(x, y - 1);
};

ImageProcessor.prototype.getBottomPixel = function(x, y) {
    return this.getPixel32(x, y + 1);
};

ImageProcessor.prototype.getTopLeftPixel = function(x, y) {
    return this.getPixel32(x - 1, y - 1);
};

ImageProcessor.prototype.getTopRightPixel = function(x, y) {
    return this.getPixel32(x + 1, y - 1);
};

ImageProcessor.prototype.getBottomLeftPixel = function(x, y) {
    return this.getPixel32(x - 1, y + 1);
};

ImageProcessor.prototype.getBottomRightPixel = function(x, y) {
    return this.getPixel32(x + 1, y + 1);
};

ImageProcessor.prototype.setPixel32 = function(x, y, pixel) {
    this.imageArrayBuffer[this.pixelPos(x, y)] = pixel;
};

ImageProcessor.prototype.setPixel = function(x, y, pixel) {
    this.setPixel32(x, y, PixelUtils.toUint(pixel));
};*/

ImageProcessor.prototype.forEachPixelSelf = function(imageBuffer, callback) {
    for (var y = 0; y < imageBuffer.height; ++y) {
        for (var x = 0; x < imageBuffer.width; ++x) {
            var pixel = callback.call(imageBuffer, x, y);
            //console.log(pixel);
            imageBuffer.setPixel(x, y, pixel);
        }
    }

    //return newBuffer;
    return this;
};

ImageProcessor.prototype.forEachPixel = function(imageBuffer, callback) {
    var uint32Array = new Uint32Array(this.imageArrayBuffer.length);
    uint32Array.set(this.imageArrayBuffer);

    for (var y = 0; y < this.height; ++y) {
        for (var x = 0; x < this.width; ++x) {
            var pixel32 = callback.call(this, x, y);
            uint32Array[this.pixelPos(x, y)] = pixel32;
        }
    }

    return uint32Array;
};

ImageProcessor.prototype.forEachPixelReduce = function(callbacksArray) {
    var uint32Array = this.forEachPixel(function(x, y) {
        var pixel = callbacksArray.reduce(function(computedPixel, callback) {
            return callback.call(this, computedPixel, x, y);
        }.bind(this), null);

        return pixel;
    }.bind(this));

    return uint32Array;
};

ImageProcessor.prototype.reduce = function() {
    this.processStack.push.apply(this.processStack, arguments);

    return this;
};

ImageProcessor.prototype.map = function(mapFunctionsArray, callback) {
    this.processStack.push(function(computedPixel, x, y) {
        var resultMap = mapFunctionsArray.map(function(mapFunction) {
            return mapFunction.call(this, computedPixel, x, y);
        }.bind(this));

        return callback.apply(this, resultMap, x, y);
    });

    return this;
};

ImageProcessor.prototype.selfApply = function(callback) {
    this.forEachPixelSelf(function(x, y){
        var pixel = callback.call(this, x, y);

        return pixel;
    });

    return this;
};

ImageProcessor.prototype.process = function() {
    this.processStack.push(function(computedPixel, x, y) {
        return PixelUtils.toUint(computedPixel);
    });

    var uint32Array = this.forEachPixelReduce(this.processStack);
    this.uint32Array = uint32Array;
    //this.imageData.data.set(new Uint8ClampedArray(uint32Array.buffer));

    this.processStack = [];

    return this;
};

ImageProcessor.prototype.grey = function() {
    return function(computedPixel, x, y) {
        var pixel = computedPixel || this.getPixel(x, y);
        var grey = (299 * pixel.r + 587 * pixel.g + 114 * pixel.b) / 1000;

        return {
            r: grey,
            g: grey,
            b: grey,
            a: pixel.a
        };
    };
};

ImageProcessor.prototype.invert = function() {
    return function(computedPixel, x, y) {
        var pixel = computedPixel || this.getPixel(x, y);
        return {
            r: 255 - pixel.r,
            g: 255 - pixel.g,
            b: 255 - pixel.b,
            a: pixel.a
        };
    };
};

ImageProcessor.prototype.test = function() {
    var func1 = function(x, y) {
        var pixel = this.getPixel(x, y);
        var grey = (299 * pixel.r + 587 * pixel.g + 114 * pixel.b) / 1000;
        return { r: grey, g: grey, b: grey, a: pixel.a };
    };
    var func2 = function(x, y, computedPixel) {
        return { r: 255 - computedPixel.r, g: 255 - computedPixel.g, b: 255 - computedPixel.b, a: computedPixel.a };
    };

    this.forEachPixel([func1, func2]);

    return this;
};

ImageProcessor.prototype.convolutionReduce = function(kernel, dividor, bias, kernelComputingCallback, pixelCallback) {
    var initialValue = null;

    var kernelComputing = function kernelComputing(computedValue, currentPixel, currentKernelWeight) {
        return {
            r: (computedValue ? computedValue.r : 0) + currentPixel.r * currentKernelWeight,
            g: (computedValue ? computedValue.g : 0) + currentPixel.g * currentKernelWeight,
            b: (computedValue ? computedValue.b : 0) + currentPixel.b * currentKernelWeight,
            a: currentPixel.a
        };
    }

    var pixelComputing = function pixelComputing(computedPixel, currentPixel, x, y) {
        PixelUtils.clamp(currentPixel);

        return {
            r: currentPixel.r / dividor + bias,
            g: currentPixel.g / dividor + bias,
            b: currentPixel.b / dividor + bias,
            a: 255
        };
    }


    kernelComputingCallback = /* kernelComputingCallback ||*/ kernelComputing;
    pixelCallback = pixelCallback || pixelComputing;

    return function(computedPixel, x, y) {
        var yOffset = Math.floor(kernel.length / 2);

        // Reduce for each line of the kernel
        resultPixel = kernel.reduce(function(computedValue, currentKernelLine, yKernel) {
            var xOffset = Math.floor(currentKernelLine.length / 2);
            if (!currentKernelLine) {
                return computedValue;
            }

            // Reduce for each weight of the kernel line
            return currentKernelLine.reduce(function(computedValue, currentKernelWeight, xKernel) {
                if (!currentKernelWeight) {
                    return computedValue;
                }

                var currentPixel = this.getPixel(x + xKernel - xOffset, y + yKernel - yOffset);

                return kernelComputingCallback.call(this,
                    computedValue,
                    currentPixel,
                    currentKernelWeight, {
                        kernelPosition: [xKernel, yKernel],
                        pixelPosition: [x, y]
                    }
                );

            }.bind(this), computedValue);
        }.bind(this), initialValue);

        return pixelCallback.call(this, computedPixel, resultPixel, x, y);
    };
};

ImageProcessor.prototype.neutral = function() {
    this.forEachPixel(function(pixel) {
        return {
            r: pixel.r,
            g: pixel.g,
            b: pixel.b,
            a: pixel.a
        };
    });

    return this;
};

ImageProcessor.prototype.energy = function() {
    var sobelPixelH, sobelPixelV, sobelResult,
        topLeft, topMiddle, topRight, bottomLeft, bottomMiddle, bottomRight, leftMiddle, rightMiddle,
        pixel,
        minEnergy;

    return function energy(x, y) {
/*        topLeft = PixelUtils.toRGBA(this.getTopLeftPixel(x, y));
        topMiddle = PixelUtils.toRGBA(this.getTopPixel(x, y));
        topRight = PixelUtils.toRGBA(this.getTopRightPixel(x, y));

        bottomLeft = PixelUtils.toRGBA(this.getBottomLeftPixel(x, y));
        bottomMiddle = PixelUtils.toRGBA(this.getBottomPixel(x, y));
        bottomRight = PixelUtils.toRGBA(this.getBottomRightPixel(x, y));

        leftMiddle = PixelUtils.toRGBA(this.getLeftPixel(x, y));
        rightMiddle = PixelUtils.toRGBA(this.getRightPixel(x, y));*/


        topLeft = this.getTopLeftPixel(x, y) & 0xFF;
        topMiddle = this.getTopPixel(x, y) & 0xFF;
        topRight = this.getTopRightPixel(x, y) & 0xFF;

        bottomLeft = this.getBottomLeftPixel(x, y) & 0xFF;
        bottomMiddle = this.getBottomPixel(x, y) & 0xFF;
        bottomRight = this.getBottomRightPixel(x, y) & 0xFF;

        leftMiddle = this.getLeftPixel(x, y) & 0xFF;
        rightMiddle = this.getRightPixel(x, y) & 0xFF;

        //& 0xFF

        /* Vertical Sobel */
        sobelPixelV =
            +1 * topLeft
            +2 * topMiddle
            +1 * topRight
            -1 * bottomLeft
            -2 * bottomMiddle
            -1 * bottomRight;

        /* Horizontal Sobel */
        sobelPixelH =
            +1 * topLeft
            +2 * leftMiddle
            +1 * bottomLeft
            -1 * topRight
            -2 * rightMiddle
            -1 * bottomRight;
        sobelResult =
            Math.sqrt((sobelPixelV * sobelPixelV) + (sobelPixelH * sobelPixelH)) / 80;


        //console.log(topLeft)
        minEnergy = Math.min(topLeft, topMiddle, topRight);
        minEnergy = isNaN(minEnergy) ? sobelResult : minEnergy + sobelResult;

        // Should be done by the canvas implementation at the browser level
        // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-canvaspixelarray-set
        /*if (minEnergy > 255) minEnergy = 255;
        if (minEnergy < 0) minEnergy = 0;*/

        //data[pixel + 1] = Math.round(minEnergy);
        //minEnergy = Math.round(minEnergy);
        return {
            r: minEnergy,
            g: minEnergy,
            b: minEnergy,
            a: 255
        };
    };
};

ImageProcessor.prototype.gaussianBlur = function() {
    var kernel = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
    ];
    var dividor = 9;
    var bias = 0;

    return this.convolutionReduce(kernel, dividor, bias);
};

ImageProcessor.prototype.sobelVertical = function() {
    var kernel = [
        [1, 2, 1],
        [0, 0, 0],
        [-1, -2, -1]
    ];
    var dividor = 1;
    var bias = 0;

    return this.convolutionReduce(kernel, dividor, bias, null);
};

ImageProcessor.prototype.sobelHorizontal = function() {
    var kernel = [
        [1, 0, -1],
        [2, 0, -2],
        [1, 0, -1]
    ];
    var dividor = 1;
    var bias = 0;

    return this.convolutionReduce(kernel, dividor, bias);
};


ImageProcessor.prototype.energy2 = function() {
    var kernelVertical = [
        [1, 2, 1],
        [0, 0, 0],
        [-1, -2, -1]
    ];

    var kernelHorizontal = [
        [1, 0, -1],
        [2, 0, -2],
        [1, 0, -1]
    ];

    var dividor = 1;
    var bias = 0;

    function kernelComputing(computedValue, currentPixel, currentKernelWeight) {
        return computedValue + currentPixel.r * currentKernelWeight;
    }

    function pixelComputing(computedValue) {
        if (computedValue > 255) {
            computedValue = 255;
        } else if (computedValue < 0) {
            computedValue = 0;

        }

        return {
            r: computedValue / dividor + bias,
            g: computedValue / dividor + bias,
            b: computedValue / dividor + bias,
            a: 255
        };
    }

    this.convolutionReduce(kernelVertical, kernelComputing, pixelComputing, 0);

    return this;
};

ImageProcessor.prototype.seamCarving = function(imageBuffer) {
    var xSeamPosition = 0,
        ySeamPosition = imageBuffer.height - 1,
        tmpEnergy = Number.MAX_VALUE,
        topLeftEnergy, topEnergy, topRightEnergy,
        minEnergyValue,
        energy,
        x, y;

    var seamArray = [];

    //search on last row
    for (x = 0; x < imageBuffer.width - 1; x++) {
        energy = imageBuffer.getPixel(x, ySeamPosition).r;
        if (energy < tmpEnergy) {
            tmpEnergy = energy;
            xSeamPosition = x;
        }
    }


    seamArray.push(imageBuffer.pixelPos(xSeamPosition, ySeamPosition));
    imageBuffer.setPixel32(xSeamPosition, ySeamPosition, 0xFFFFFFFF);
    lastMinEnergyPosition = xSeamPosition;

    for (ySeamPosition = imageBuffer.height - 2; ySeamPosition >= 0; ySeamPosition--) {
        topLeftEnergy = PixelUtils.toRGBA(imageBuffer.getTopLeftPixel(xSeamPosition, ySeamPosition)).r;
        topEnergy = PixelUtils.toRGBA(imageBuffer.getTopPixel(xSeamPosition, ySeamPosition)).r;
        topRightEnergy = PixelUtils.toRGBA(imageBuffer.getTopRightPixel(xSeamPosition, ySeamPosition)).r;

        minEnergyValue = topEnergy;
        //xSeamPosition = lastMinEnergyPosition;

        //Low energy + detect the image left and right borders
        if (topLeftEnergy < minEnergyValue /*&& ((topMiddlePosition % (currentWidth)) > 0)*/ ) {
            minEnergyValue = topEnergy;
            xSeamPosition = xSeamPosition - 1;
        }
        if (topRightEnergy < minEnergyValue /*&& (((topMiddlePosition + 4) % (currentWidth)) > 0)*/ ) {
            minEnergyValue = topRightEnergy;
            xSeamPosition = xSeamPosition + 1;
        }

        seamArray.unshift(imageBuffer.pixelPos(xSeamPosition, ySeamPosition));

        imageBuffer.setPixel32(xSeamPosition, ySeamPosition, 0xFFFFFFFF);
    }

//    this.imageData.data.set(new Uint8ClampedArray(this.uint32Array.buffer));

    return seamArray;
};

/*ImageProcessor.prototype.stripSeam = function(imageBuffer, seam) {
    imageBuffer.imageArray = imageBuffer.imageArray.filter(function filter(pixel, index) {
        return seam.indexOf(index) === - 1;
    });
    imageBuffer.width--;

    return imageBuffer;
};*/

ImageProcessor.prototype.stripSeam = function(imageBuffer, seam) {
    //console.log(">1", imageBuffer.imageArray.length)
    var startIndex = 0;
    var lastLength = 0;
    var slice;
    var imageBufferClone = imageBuffer.clone();
    //console.log(imageBufferClone.imageArray.length)
    imageBufferClone.imageArray = new Uint32Array(imageBuffer.imageArray.length - imageBuffer.height);
    //console.log(imageBufferClone.imageArray.length)

    seam.forEach(function(seamIndex) {
        slice = imageBuffer.imageArray.slice(startIndex, seamIndex);
//console.log("slice", slice.length)
        //slice.copyWithin(imageBufferClone.imageArray, lastLength);
        imageBufferClone.imageArray.set(slice, lastLength)
        startIndex = seamIndex + 1;
        lastLength += slice.length;
    //console.log(">>", slice)
    //console.log(">>>", imageBufferClone.imageArray)
    });
    //console.log(">2", imageBufferClone.imageArray.length)
    slice = imageBuffer.imageArray.slice(startIndex);
    imageBufferClone.imageArray.set(slice, lastLength)
    imageBuffer.imageArray = imageBufferClone.imageArray;

    imageBuffer.width--;

    //console.log(">3", imageBuffer.imageArray.length)
};