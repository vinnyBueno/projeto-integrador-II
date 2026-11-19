// Valida um CPF pelos dígitos verificadores.
// Aceita com ou sem pontuação. Devolve true ou false.
function cpfValido(valor) {
    const cpf = String(valor ?? '').replace(/\D/g, '');

    // Precisa ter 11 dígitos
    if (cpf.length !== 11) return false;

    // Rejeita sequências repetidas (111.111.111-11, 000.000.000-00...),
    // que passam na conta dos dígitos mas não existem
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Calcula um dígito verificador a partir dos primeiros "tamanho" dígitos
    const calcularDigito = (tamanho) => {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) {
            soma += Number(cpf[i]) * (tamanho + 1 - i);
        }
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    return (
        calcularDigito(9) === Number(cpf[9]) &&
        calcularDigito(10) === Number(cpf[10])
    );
}

module.exports = { cpfValido };