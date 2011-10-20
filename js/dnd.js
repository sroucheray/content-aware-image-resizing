/**
 * @author sroucheray
 */
var dnd = {};
dnd.init = function(){
	var that = this;
	var transferString = "You're dragging the handler";
	this.startDragHandler = function(event){
		if (event.target == document.getElementById('poigne')) {
			var dt = event.dataTransfer;
			
			seam_carving.refresh = false;
			
			canvas = document.createElement("canvas");
			canvas.width = canvas.height = 1;
			
			that.originalWidth = event.clientX;
			that.current = seam_carving.imgStore.current;
			
			dt.effectAllowed = "move";
			dt.setData('text/plain', transferString);
		    dt.setDragImage(canvas, 1, 1);
		}
	};

	this.tvSetDraggingHandler = function(event){
		if (event.dataTransfer.getData('text/plain') == transferString) {
			seam_carving.drawStoreAtPosition(that.current + event.clientX - that.originalWidth);
		}
	};
}


