import { useState, useMemo } from 'react';
import type { TargetVariable } from '../types';
import { MODELS } from '../lib/constants';

export const useModelSelector = () => {
    const [line, setLine] = useState<string>('D');
    const [modelType, setModelType] = useState<string>('LinearRegression');
    const [target, setTarget] = useState<TargetVariable | null>(null);

    const modelName = useMemo(() => {
        if (!modelType || !line || !target) return '';

        // Elle ne supprime plus les caractères spéciaux comme '˃' ou ','.
        const cleanTargetName = target.name
            .replace(/\s+/g, '_')  // Remplace les espaces par des underscores
            .replace(/%/g, 'pct')   // Remplace '%' par 'pct'
            .replace(/-/g, '_');    // Remplace '-' par '_'
            
        return `${modelType.toLowerCase()}_${line}_${cleanTargetName}`;


    }, [modelType, line, target]);

    const modelDisplayName = useMemo(() => {
        return MODELS.find(m => m.value === modelType)?.name || modelType;
    }, [modelType]);

    return {
        line, setLine,
        modelType, setModelType,
        target, setTarget,
        modelName,
        modelDisplayName
    };
};