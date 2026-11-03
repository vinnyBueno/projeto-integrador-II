// Recebe um erro e identifica seu código Oracle.
function mapOracleErrorToHttp(err) {

    // Verifica se o erro existe e possui um código Oracle.
    // Se não possuir, retorna null.
    if (!err || !err.errorNum) {
        return null;
    }

    // Analisa o código do erro para identificar sua causa.
    switch (err.errorNum) {

        // ORA-00001: violação de chave única.
        // Exemplo: CPF ou e-mail já cadastrado.
        case 1:
            return {
                status: 409,
                code: 'DUPLICATE',
                message: 'Já existe um registro com esses dados.'
            };

        // ORA-01400: tentativa de inserir NULL em campo obrigatório.
        case 1400:
            return {
                status: 422,
                code: 'REQUIRED_FIELD',
                message: 'Um ou mais campos obrigatórios não foram preenchidos.'
            };

        // ORA-02291: chave estrangeira não encontrada.
        // Exemplo: paciente ou profissional inexistente.
        case 2291:
            return {
                status: 422,
                code: 'FOREIGN_KEY_NOT_FOUND',
                message: 'Um dos registros relacionados não foi encontrado.'
            };

        // ORA-02292: registro possui outros registros relacionados.
        // Exemplo: tentar excluir um paciente que possui atendimentos.
        case 2292:
            return {
                status: 409,
                code: 'RECORD_IN_USE',
                message: 'Não é possível excluir este registro, pois existem registros relacionados.'
            };

        // Qualquer outro erro Oracle não tratado especificamente.
        default:
            return {
                status: 500,
                code: 'DATABASE_ERROR',
                message: 'Ocorreu um erro interno no banco de dados.'
            };
    }
}

// Exporta a função para ser utilizada pelos controllers.
module.exports = { mapOracleErrorToHttp };
