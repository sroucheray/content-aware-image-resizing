/**
 * @author @sroucheray
 * 
 */

/*
 * Bypass firebug objects and methods if does not exist 
 */
(function(){
	if (! ("console" in window) || !("firebug" in console)) {
	    var names = ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml", "group"
	                 , "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];
	    window.console = {};
	    for (var i = 0; i <names.length; ++i) window.console[names[i]] = function() {};
	}
})();

/*
 * Initialization
 */
if (!seam_carving) {
	var seam_carving = {};
}
/*
seam_carving.reduceSize = 50;	//Number of vertical seams that can be carved on original image
seam_carving.quality    = 50;	//Lower is better, higher is faster, not higher than reduceSize, works only if factor is 1
seam_carving.factor     = 1;	//Must be set to 1 or 2
								//Quality and factor are mutually exclusives
*/

seam_carving.init = function(arguments){
	document.getElementById('submitButton').disabled = 'disabled';
	document.getElementById("progressBar").style.display = "block";
	
	this.reduceSize = arguments.seams||50;
	this.refresh = arguments.refresh;
	this.pseudoView = 1;	//0 : grayscale, 1 : energy
	
	if (arguments.quality) {
		switch (arguments.quality) {
			case 'full':
				this.quality = 1;
				this.factor = 1;
				break;
			case 'medium':
				this.quality = this.reduceSize;
				this.factor = 1;
				break;
			case 'low':
			default:
				this.quality = this.reduceSize;
				this.factor = 2;
				break;
		}
	};
	
    var img = new Image();
	
	if (!this.imgStore || this.imgStore.url != arguments.url) {
		this.imgStore = {
			current: null,
			scaleDownLength: 0,
			url:arguments.url
		};
	};
	
	var that = this;
	
    img.onload = function(){
        var ref = document.getElementById("referenceImg");
		that.canvas = document.getElementById("canvas");
		that.canvasRef = document.getElementById("referenceCanvas");
        that.ctx = that.canvas.getContext("2d");
        that.ctxRef = that.canvasRef.getContext("2d");
		ref.src = this.src;
		that.canvas.width = that.imgStore.oriWidth = ref.width = this.width;
		that.canvas.height = that.imgStore.oriHeight = ref.height = this.height;
		
		that.resetHandlerPos();
		
        that.ctx.drawImage(img, 0, 0);
        that.resultImg = that.ctx.getImageData(0, 0, that.canvas.width, that.canvas.height);
		that.imgStore["'"+ 0 + "'"] = {};
		that.imgStore["'"+ 0 + "'"].image = that.resultImg;
		that.imgStore.current = 0;
		that.imgStore.largest = 0;
		that.imgStore.smallest = 0;
		
		that.iteration = 1;
		that.time = new Date().getTime();
		that.process(that.reportResult);
    };
    img.src = arguments.url;

	document.onkeydown = function(event){
		if (event.keyCode == 39){
			if (Math.abs(that.imgStore.current) > 0) {
				that.incrementStorePosition();
			}
		}else if(event.keyCode == 37){
			if (Math.abs(that.imgStore.current) < that.imgStore.scaleDownLength) {
				that.decrementStorePosition();
			}
		} 
	};
	
};

seam_carving.process = function (reportResult) {
	that = this;
	//DFN "Don't freeze the Navigator" pattern
    (function () {
		
        if (that.iteration <= that.reduceSize && 
			((that.imgStore["'-" + that.iteration + "'"] &&
			that.imgStore["'-" + that.iteration + "'"].quality != that.quality &&
			that.imgStore["'-" + that.iteration + "'"].factor != that.factor) || 
			!that.imgStore["'-" + that.iteration + "'"] )) {
			
			var reducedImg = that.ctx.createImageData(that.resultImg.width - that.factor, that.resultImg.height);
				
			if (that.factor == 1){
				if (that.iteration % that.quality == 0 || that.iteration == 1){
					that.pseudoImg = that.ctx.createImageData(that.resultImg.width, that.resultImg.height);
					that.buildGrayImg(that.resultImg, that.pseudoImg);
					that.buildEnergyMap(that.pseudoImg);
					if (that.iteration == 1) {
						that.imgStore["'" + 0 + "'"].pseudo = that.pseudoImg;
					}
				}
				that.buildSeamMap(that.pseudoImg);
				
				if (that.refresh) that.drawStoreAtPosition(-that.iteration);
				
				that.resultImg = that.sliceSeam(that.resultImg, that.pseudoImg, reducedImg);
				
				reducedImg = that.ctx.createImageData(that.resultImg.width, that.resultImg.height);
				
				that.imgStore["'-" + that.iteration + "'"] = {
					image: that.resultImg,
					pseudo: that.pseudoImg
				};
				
				that.pseudoImg = that.sliceSeam(that.pseudoImg, that.pseudoImg, reducedImg);
				
			} else{
				that.pseudoImg = that.ctx.createImageData(that.resultImg.width/that.factor, that.resultImg.height/that.factor);
				
				
				that.buildGrayImg(that.resizeImg(that.resultImg, 1 / that.factor), that.pseudoImg);
				that.buildEnergyMap(that.pseudoImg);
				that.buildSeamMap(that.pseudoImg);
				that.pseudoImg = that.resizeImg(that.pseudoImg, that.factor);
				if (that.iteration == 1){
					that.imgStore["'"+ 0 + "'"].pseudo = that.pseudoImg;
				}
				if (that.refresh) that.drawStoreAtPosition(-that.iteration);
				that.resultImg = that.sliceSeam(that.resultImg, that.pseudoImg, reducedImg);
				
				that.imgStore["'-" + that.iteration + "'"] = {
					image: that.resultImg,
					pseudo: that.pseudoImg,
					quality: this.quality,
					factor: this.factor
				};
			}

            // Inform the application of the progress
            that.reportResult(that.iteration, that.reduceSize,that.resultImg);
			
			that.imgStore.scaleDownLength += 1 * that.factor;
			
			that.imgStore.smallest = -that.iteration;
			
			that.iteration = that.iteration + (1 * that.factor);

            // Process next chunk
            setTimeout(arguments.callee, 0);
        }else{
			that.time = new Date().getTime() - that.time;
			document.getElementById("output").innerHTML += " : "+ (that.time/1000) + " sec.";
			document.getElementById('submitButton').disabled = false;
		}
    })();
};

/*
 * Image processing methods
 */
seam_carving.buildGrayImg = function (srcImg, pseudoImg){
	var pixel,
	pseudoImgData = pseudoImg.data,
	srcImgData = srcImg.data;
	for (pixel = 0; pixel < pseudoImgData.length; pixel += 4) {
			pseudoImgData[pixel] =  (299 * srcImgData[pixel] + 587 * srcImgData[pixel + 1] + 114 * srcImgData[pixel + 2])/1000;
	}
};

seam_carving.resizeImg = function (srcImg, factor){
	var targetWidth = Math.round(srcImg.width * factor),
	targetHeight = Math.round(srcImg.height * factor);
	
	var targetImg = this.ctx.createImageData(targetWidth, targetHeight);
	var pixel, x, y;
	if (factor == 1) {
		return srcImg;
	}//Subsampling
	else if (factor < 1) {
			for (y = 0; y < targetHeight; y++) {
				for (x = 0; x < targetWidth; x++) {
					srcPixel = Math.round((y * srcImg.width + x) * 4 / factor);
					targetPixel = (y * targetWidth + x) * 4;
					srcPixel = srcPixel - srcPixel % 4;
					targetPixel = targetPixel - targetPixel % 4;
					
					targetImg.data[targetPixel] = srcImg.data[srcPixel];
					targetImg.data[targetPixel + 1] = srcImg.data[srcPixel + 1];
					targetImg.data[targetPixel + 2] = srcImg.data[srcPixel + 2];
					targetImg.data[targetPixel + 3] = srcImg.data[srcPixel + 3];
				}
			}
		}//nearest neighbor interpolation (only works when factor == 2 for now)
		else if (factor > 1 ){
			for (y = 0; y < srcImg.height; y++) {
				for (x = 0; x < srcImg.width; x++) {
					srcPixel = Math.round((y * srcImg.width + x) * 4);
					targetPixel = (y * targetWidth + x) * 4 * factor;
					srcPixel = srcPixel - srcPixel % 4;
					targetPixel = targetPixel - targetPixel % 4;
					
					targetImg.data[targetPixel] = srcImg.data[srcPixel];
					targetImg.data[targetPixel + 1] = srcImg.data[srcPixel + 1];
					targetImg.data[targetPixel + 2] = srcImg.data[srcPixel + 2];
					targetImg.data[targetPixel + 3] = srcImg.data[srcPixel + 3];
					
					targetImg.data[targetPixel     + 4] = srcImg.data[srcPixel];
					targetImg.data[targetPixel + 1 + 4] = srcImg.data[srcPixel + 1];
					targetImg.data[targetPixel + 2 + 4] = srcImg.data[srcPixel + 2];
					targetImg.data[targetPixel + 3 + 4] = srcImg.data[srcPixel + 3];
					
					targetImg.data[targetPixel     + targetWidth * 4] = srcImg.data[srcPixel];
					targetImg.data[targetPixel + 1 + targetWidth * 4] = srcImg.data[srcPixel + 1];
					targetImg.data[targetPixel + 2 + targetWidth * 4] = srcImg.data[srcPixel + 2];
					targetImg.data[targetPixel + 3 + targetWidth * 4] = srcImg.data[srcPixel + 3];
				
					targetImg.data[targetPixel     + 4 + targetWidth * 4] = srcImg.data[srcPixel];
					targetImg.data[targetPixel + 1 + 4 + targetWidth * 4] = srcImg.data[srcPixel + 1];
					targetImg.data[targetPixel + 2 + 4 + targetWidth * 4] = srcImg.data[srcPixel + 2];
					targetImg.data[targetPixel + 3 + 4 + targetWidth * 4] = srcImg.data[srcPixel + 3];
				}
			}
		}
	return targetImg;
}

seam_carving.buildEnergyMap = function (pseudoImg){
		var width = pseudoImg.width, 
		height = pseudoImg.height,
		data = pseudoImg.data,
     
		sobelPixelH, sobelPixelV, sobelResult,
		topLeft, topMiddle, topRight, bottomLeft, bottomMiddle, bottomRight, leftMiddle, rightMiddle,
		
		pixel,
		
		minEnergy,
		
		p;
		for (pixel = 0; pixel < data.length; pixel += 4) {
				
			topLeft =      pixel - (width + 1) * 4;
			topMiddle =    pixel - (width    ) * 4;
			topRight =     pixel - (width - 1) * 4;
			
			bottomLeft =   pixel + (width - 1) * 4;
			bottomMiddle = pixel + (width    ) * 4;
			bottomRight =  pixel + (width + 1) * 4;
			
			leftMiddle =   pixel - 4;
			rightMiddle =  pixel + 4;

			/* Vertical Sobel */
			sobelPixelV =
				+ 1 * (data[topLeft]     || 0)
				+ 2 * (data[topMiddle]   || 0)  
				+ 1 * (data[topRight]    || 0) 
				- 1 * (data[bottomLeft]  || 0) 
				- 2 * (data[bottomMiddle]|| 0) 
				- 1 * (data[bottomRight] || 0);
			
			/* Horizontal Sobel */
			sobelPixelH =
				+ 1 * (data[topLeft]     || 0)
				+ 2 * (data[leftMiddle]  || 0)  
				+ 1 * (data[bottomLeft]  || 0) 
				- 1 * (data[topRight]    || 0) 
				- 2 * (data[rightMiddle] || 0) 
				- 1 * (data[bottomRight] || 0);
			sobelResult = 
				Math.sqrt((sobelPixelV* sobelPixelV)+(sobelPixelH * sobelPixelH))/80;
			
			minEnergy = Math.min(Math.min(data[topLeft+1],data[topMiddle+1]),data[topRight+1]);
			minEnergy = isNaN(minEnergy) ? sobelResult : minEnergy + sobelResult;
			
			/* Should be done by the canvas implementation at the browser level
			 http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-canvaspixelarray-set
			 if (minEnergy > 255) minEnergy = 255;
			if (minEnergy < 0) minEnergy = 0;*/
			
			data[pixel + 1] = Math.round(minEnergy);
		}
};

seam_carving.buildSeamMap = function(pseudoImg){
	var minEnergyPosition,
	tmpEnergy = Number.MAX_VALUE,
	currentWidth = pseudoImg.width,
	currentHeight = pseudoImg.height,
	pseudoImgData = pseudoImg.data,
	topLeftPosition, topMiddlePosition, topRightPosition,topLeftValue, topMiddleValue, topRightValue,
	minEnergyValue,
	
	pixel,
	x, y;
	
	//search on last row
	for (x = 0; x < currentWidth ; x++) {
		pixel = ( (currentHeight - 1) * currentWidth + x    ) * 4;
		if (pseudoImgData[pixel+1] < tmpEnergy){
			minEnergyPosition = pixel;
			tmpEnergy = pseudoImgData[pixel+1];
		}
	}
	pseudoImgData[minEnergyPosition + 0] = 255;
	pseudoImgData[minEnergyPosition + 1] = 255;
	pseudoImgData[minEnergyPosition + 2] = 255;

	lastMinEnergyPosition = minEnergyPosition - 4;

	for (y = currentHeight - 1; y > 0 ; y--) {
		topLeftPosition =      minEnergyPosition - currentWidth * 4 - 4;
		topMiddlePosition =    minEnergyPosition - currentWidth * 4;
		topRightPosition =     minEnergyPosition - currentWidth * 4 + 4;

		topLeftValue =      pseudoImgData[topLeftPosition   + 1];
		topMiddleValue =    pseudoImgData[topMiddlePosition + 1];
		topRightValue =     pseudoImgData[topRightPosition  + 1];
		
		minEnergyValue = topMiddleValue;
		minEnergyPosition = topMiddlePosition;
		
		//Low energy + detect the image left and right borders
		if (topLeftValue < minEnergyValue && ((topMiddlePosition % (currentWidth)) > 0)){
			minEnergyValue = topMiddleValue;
			minEnergyPosition = topLeftPosition;
		}
		if (topRightValue < minEnergyValue && (((topMiddlePosition + 4) % (currentWidth)) > 0)){
			minEnergyValue = topRightValue;
			minEnergyPosition = topRightPosition;
		}
		pseudoImgData[minEnergyPosition + 0] = 255;
		pseudoImgData[minEnergyPosition + 1] = 255;
		pseudoImgData[minEnergyPosition + 2] = 255;

	}
};

seam_carving.sliceSeam = function(srcImgData, srcSeamMapData, resultImage){
	//-2 and -1 must be set according to the factor
	var srcImgDataData = srcImgData.data,
	resultImageData = resultImage.data,
	oldIndex = 0, 
	newIndex = 0;
	var numberFound = 0;
	while(oldIndex < srcImgDataData.length){
		if (srcSeamMapData.data[oldIndex + 2] == 0) {
			resultImageData[newIndex] =    srcImgDataData[oldIndex];
			resultImageData[newIndex+1] =  srcImgDataData[oldIndex+1];
			resultImageData[newIndex+2] =  srcImgDataData[oldIndex+2];
			resultImageData[newIndex+3] =  srcImgDataData[oldIndex+3];

			newIndex += 4;
			
		}
		oldIndex += 4;
	}
	//console.log("Pixel found : "+numberFound);
	return resultImage;
};

/*
 * Utility methods 
 * 
 */

seam_carving.showPseudoImage = function (image, num){
	var data = 	image.data, index = 0;
	resultImg = this.ctx.createImageData(image.width, image.height);//this.pseudoImg;
	if (num || num == 0) {
		while (index < data.length) {
			resultImg.data[index] = data[index + num];
			resultImg.data[index + 1] = data[index + num];
			resultImg.data[index + 2] = data[index + num];
			resultImg.data[index + 3] = 255;
			//if (resultImg.data[index    ] > 0 )console.log(index);
			index += 4;
		}
	}else {
		while (index < data.length) {
			resultImg.data[index] = data[index];
			resultImg.data[index + 1] = data[index + 1];
			resultImg.data[index + 2] = data[index + 2];
			resultImg.data[index + 3] = 255;
			//if (resultImg.data[index    ] > 0 )console.log(index);
			index += 4;
		}
	}
	return resultImg;
};
seam_carving.changeReference = function (select){
	switch(select.value){
		case 'css':
			document.getElementById("referenceCanvas").parentNode.style.display = 'none';
			document.getElementById("referenceImg").parentNode.style.display = 'block';
			this.pseudoView = null;
		break;
		case 'gray':
			document.getElementById("referenceCanvas").parentNode.style.display = 'block';
			document.getElementById("referenceImg").parentNode.style.display = 'none';
			this.pseudoView = 0;
		break;
		case 'energy':
			document.getElementById("referenceCanvas").parentNode.style.display = 'block';
			document.getElementById("referenceImg").parentNode.style.display = 'none';
			this.pseudoView = 1;
		break;
		default:
		break;
	}
	this.drawStoreAtPosition(this.imgStore.current, true);
}
seam_carving.drawStoreAtPosition = function(pos, force, report){
	//console.log(pos+"/"+this.imgStore.smallest+"/"+this.imgStore.largest);
	var exist = false;
	if (pos > this.imgStore.largest){
		pos = this.imgStore.largest;
	}else if (pos < this.imgStore.smallest){
		pos = this.imgStore.smallest;
	}
	
	if (pos == this.imgStore.current && !force){
		return;
	}
	
	if (this.imgStore["'"+pos+"'"]){
		document.getElementById("referenceImg").width = this.canvas.width = this.imgStore.oriWidth + pos;
		exist = true;
		this.imgStore.current = pos;
	}
	else {
		console.log("No image in store at position " + pos);
	}
	if (exist){
		if (this.pseudoView == 0 || this.pseudoView == 1 || this.pseudoView == 2) {
			this.canvasRef.width = this.imgStore["'" + pos + "'"].pseudo.width;
			this.canvasRef.height = this.imgStore["'" + pos + "'"].pseudo.height;
			this.ctxRef.putImageData(
				this.showPseudoImage(this.imgStore["'" + pos + "'"].pseudo, this.pseudoView), 
				0, 0
			);
		}
		this.canvas.width = this.imgStore["'" + pos + "'"].image.width;
		this.canvas.height = this.imgStore["'" + pos + "'"].image.height;
		this.ctx.putImageData(this.imgStore["'" + pos + "'"].image, 0, 0);
	}
	this.resetHandlerPos();
	if (report) {
		this.reportResult(Math.abs(this.imgStore.current), this.imgStore.scaleDownLength);
	}
}

seam_carving.resetHandlerPos = function(){
		var poigne = document.getElementById('poigne'),
		resizedContent = document.getElementsByClassName("resizedContent")[0];
		
		poigne.style.left = resizedContent.offsetLeft + resizedContent.clientWidth+ 30 +"px";
		//poigne.style.left = this.canvas.offsetLeft + this.canvas.offsetWidth +"px";
		
		poigne.style.top = resizedContent.offsetTop + "px";
		poigne.style.height = resizedContent.offsetHeight + "px";
}

seam_carving.incrementStorePosition = function(){
	console.log("Increment "+(this.imgStore.current));
	if (that.factor == 2 && this.imgStore.current == 0) {
		this.drawStoreAtPosition(1);
	}
	else {
		this.drawStoreAtPosition(this.imgStore.current + this.factor);
	}
};
seam_carving.decrementStorePosition = function(){
	console.log("Decrement "+(this.imgStore.current));
	if (that.factor == 2 && this.imgStore.current == 0) {
		this.drawStoreAtPosition(-1);
	}
	else {
		this.drawStoreAtPosition(this.imgStore.current - this.factor);
	}
};


seam_carving.reportResult = function(value, total){
	this.currentImage = 0;

	if (value == total || (value + 1 == total) && this.factor == 2){
		document.getElementById("progressBar").style.display = "none";
	}
	if (this.factor == 2 && value != 0){
		document.getElementById("progressBar").style.width = 100 * (value+1) / (total)+"%";
		document.getElementById("output").innerHTML = (value+1)+" seams over "+total;

	}else{
		document.getElementById("progressBar").style.width = 100 * value / (total)+"%";
		document.getElementById("output").innerHTML = value+" seams over "+total;

	}

};


window.addEventListener("load",function(event){
	dnd.init(); 
	document.getElementById('submitButton').click();
	
	document.body.addEventListener("dragover",dnd.tvSetDraggingHandler,false);
	document.body.addEventListener("dragstart",dnd.startDragHandler,false);
},false);

