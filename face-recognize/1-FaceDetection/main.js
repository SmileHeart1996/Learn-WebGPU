(async () => {
    const MODEL_URL = '../models/';
    await faceapi.loadFaceDetectionModel(MODEL_URL);
    await faceapi.loadFaceLandmarkModel(MODEL_URL);
    await faceapi.loadFaceRecognitionModel(MODEL_URL);

    const input = document.getElementById('myImg');
    const canvas = document.getElementById('myCanvas');
    const displaySize = {
        width: input.width,
        height: input.height,
    };
    faceapi.matchDimensions(canvas, displaySize)

    let fullFaceDescriptions = await faceapi
        .detectAllFaces(input)
        .withFaceLandmarks()
        .withFaceDescriptors();
    fullFaceDescriptions = faceapi.resizeResults(fullFaceDescriptions, displaySize);
    faceapi.draw.drawDetections(canvas, fullFaceDescriptions);
    faceapi.draw.drawFaceLandmarks(canvas, fullFaceDescriptions);
})();