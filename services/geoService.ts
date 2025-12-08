
export interface AddressData {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string; // Cidade
    uf: string;
    erro?: boolean;
}

export interface Coordinates {
    lat: number;
    lng: number;
}

// Busca endereço pelo CEP usando ViaCEP (Brasil)
export const fetchAddressByCEP = async (cep: string): Promise<AddressData | null> => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (data.erro) return null;
        return data;
    } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        return null;
    }
};

// Busca coordenadas (Lat/Lng) a partir de um endereço completo usando Nominatim (OpenStreetMap)
export const fetchCoordinates = async (address: string): Promise<Coordinates | null> => {
    try {
        const encodedAddress = encodeURIComponent(address);
        // Nominatim requires a User-Agent, browser sends it automatically. 
        // We add email param as per usage policy for identification if heavy usage.
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`);
        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar coordenadas:", error);
        return null;
    }
};
