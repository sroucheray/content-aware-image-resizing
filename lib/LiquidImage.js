'use strict';
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.LiquidImage = factory();
    }
}(this, function() {
    var LiquidImage = function(image) {
        if (!(image instanceof HTMLImageElement)) {
            throw new TypeError('image must be an instance of Image');
        }

        this.image = image;
        this.originalWidth = image.width;
        this.originalHeight = image.height;

        this.createWorker('grey');
        this.createCanvas('grey', image.width, image.height);

        var imageData = this.getContext('grey').getImageData(0, 0, image.width, image.height);

        this.onMessage('grey', function(event){
            if(event.data.command === 'energy') {
                this.createCanvas('energy', event.data.width, event.data.height);
                var energyImageData = this.getContext('energy').getImageData(0, 0, event.data.width, event.data.height)
                //console.log("energyImageData", energyImageData, energyImageData.width)
                energyImageData.data.set(new Uint8ClampedArray(event.data.imageData));
                this.getContext('energy').putImageData(energyImageData, 0, 0);
            }

            if(event.data.command === 'seam') {
                this.originalWidth--;
                this.createCanvas('grey', event.data.width, event.data.height)
                imageData = this.getContext('grey').getImageData(0, 0, event.data.width, event.data.height)
                imageData.data.set(new Uint8ClampedArray(event.data.imageData));
                this.getContext('grey').putImageData(imageData, 0, 0);
            }

        }.bind(this));

        this.postMessage('grey', {
            command: 'process',
            imageData: imageData
        }, [imageData]);
    };

    LiquidImage.prototype.createWorker = function(name) {
        //TODO: use BlobURL ?
        if (!this.workers) {
            this.workers = {};
        }
        this.workers[name] = new Worker('../lib/LiquidImageWorker.js');
        this.workers[name].onmessage = function (message) {
            this.triggerMessage(name, message);
        }.bind(this);
    };

    LiquidImage.prototype.triggerMessage = function(name, message) {
        if(this.messageHandlers && this.messageHandlers[name]){
            this.messageHandlers[name].forEach(function(callback) {
                callback.call(this, message);
            }.bind(this));
        }
    };

    LiquidImage.prototype.onMessage = function(name, callback) {
        if (!this.messageHandlers) {
            this.messageHandlers = {};
        }

        if(!this.messageHandlers[name]) {
            this.messageHandlers[name] = [];
        }

        this.messageHandlers[name].push(callback);
    };

    LiquidImage.prototype.postMessage = function(name, message) {
        this.workers[name].postMessage(message);
    };

    LiquidImage.prototype.createCanvas = function(name, width, height) {
        var canvas;
        if(!this[name]){
            //this[name].canvas.parentNode.removeChild(this[name].canvas);
            canvas = document.createElement('canvas');

            this[name] = {
                canvas: canvas
            };
            document.body.appendChild(canvas);
        }

        this[name].context = this[name].canvas.getContext('2d');
        //var context = canvas.getContext('2d');

        //console.log("create", name, "width", this.originalWidth)

         this[name].canvas.setAttribute('width', width);
         this[name].canvas.setAttribute('height', height);
         this[name].canvas.setAttribute('id', name);

         this[name].context.drawImage(this.image, 0, 0);
    };

    LiquidImage.prototype.toGrey = function() {
        this.postMessage('grey', this);
    };

    LiquidImage.prototype.getCanvas = function(name) {
        return this[name].canvas;
    };

    LiquidImage.prototype.getContext = function(name) {
        return this[name].context;
    };

    return LiquidImage;
}));
