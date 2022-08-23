const video = document.getElementById('video');

const MODEL_URL = '../models/';
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
]).then(startVideo);

function startVideo(){
    navigator.getUserMedia(
        {video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}

video.addEventListener('play', () => {
	const canvas = faceapi.createCanvasFromMedia(video);
	document.body.append(canvas);
	const displaySize = {width: video.width, height: video.height};
	faceapi.matchDimensions(canvas, displaySize);
   setInterval(async () => {
		 const detections = await faceapi.detectAllFaces(video,
			new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
			console.log(detections);
			const resizedDetection = faceapi.resizeResults(detections, displaySize);
			canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
			faceapi.draw.drawDetections(canvas, resizedDetection)
			faceapi.draw.drawFaceLandmarks(canvas, resizedDetection)
			faceapi.draw.drawFaceExpressions(canvas, resizedDetection)
	 }, 100);
});