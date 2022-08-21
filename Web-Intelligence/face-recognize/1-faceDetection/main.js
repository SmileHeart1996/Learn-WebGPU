(async () => {
    const MODEL_URL = '../models/'
    await faceapi.loadFaceDetectionModel(MODEL_URL)
    await faceapi.loadFaceLandmarkModel(MODEL_URL)
    await faceapi.loadFaceRecognitionModel(MODEL_URL)

    const minConfidence = 0.8
    const fullFaceDescriptions = await faceapi.allFaces(input, minConfidence)

    const resized = fullFaceDescriptions.map(fd => fd.forSize(width, height))
    fullFaceDescription.forEach((fd, i) => {
        faceapi.drawDetection(canvas, fd.detection, { withScore: true })
    })
    fullFaceDescription.forEach((fd, i) => {
        faceapi.drawLandmarks(canvas, fd.landmarks, { drawLines: true })
    })
})();