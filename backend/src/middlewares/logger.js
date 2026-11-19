function logger(req, res, next) {
    // Cada requisição mede o próprio tempo, mesmo quando chegam várias juntas.
    const inicio = Date.now();
    console.log(`Método: ${req.method}; URL: ${req.url}`);

    res.on('finish', () => {
        console.log('Finalizou');
        console.log(`Requisição: ${Date.now() - inicio}ms`);
    });

    next();
}

module.exports = logger;
