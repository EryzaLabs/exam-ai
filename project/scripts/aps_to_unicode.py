# -*- coding: utf-8 -*-
"""
APS-DV / APS-Priyanka / APS-Prakash to Devanagari Unicode Converter
Derived from UP Department of Culture & Tech Hindi Font Converters.
100% authentic conversion for DSSSB/UP TGT/PGT books published by YCT.
"""

import json
from pathlib import Path

_A1 = ["FË", "eq", "ef", "ss", "Rb", "==", "gâ", "gbâ", "bâ", "sâ", "tâ", "&s", "e&â", "e@â", "eWâ", "òeâ", "eR", "Dee@", "X", "x", "Z", "z", "eA", "ea", "Ë", "e|", "eE", "eR", "eé", "›eâ", "kesâ", "ke=â", "kegâ", "Ìkeâ", "ÌHeâ", "Ìpe", "ÌKe", "ÌÙe", "Ìie", "Heâ", "heâ", "Heä", "heä", "Ìkeä", "ÌK", "Ô", "~", "$e+", "Í", "Î", "Œe", "Œ", "œe", "œ", "®", "™", "¤", "°Ÿe", "óŸe", "šŸe", "\"Ÿe", "[Ÿe", "{Ÿe", "ß", "$", "«", "›", "¿", "Ö", "Ø", "Ü", "ã", "ø", "õ", "#", "%", "V", "„", "…", "‰", "‹", "“", "”", "¢", "£", "¥", "©", "ª", "§", "°", "º", "»", "À", "Á", "Â", "Ã", "Ä", "Å", "Æ", "È", "É", "Ñ", "Õ", "æ", "ñ", "ò", "ó", "ô", "ö", "ù", "ú", "û", "ÿ", "Ì[", "Ì{", ">", "Ÿ", "^", "Ç", "ü", "ê", "De", "F&", "F", "G", "è", "S", "T", "keä", "keâ", "¡", "K", "i", "I", "*", "Û", "Ú", "p", "P", "_", "š", "\"", "[", "{", "C", "l", "L", "o", "O", "v", "h", "H", "y", "Y", "c", "Ù", "j", "u", "}", "à", "k", "J", "U", "M", "ç", "ë", "<", "m", "å", "n", "N", "er", "e", "¦", "¶", "ƒ", "†", "‡", "á", "ì", "í", "î", "g", "Ï", "t", "Ò", "=", "ï", "s", "w", "b", "B", "Š", "d", "]", "Ì", "@", "Ó", "Ê", "Q", "W", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "्ा", "्ो", "्ौ", "अो", "अा", "आै", "आे", "ाो", "ाॅ", "ॅा", "ाे", "एे", "ंु", "ेे", "अै", "ाे", "अे", "ंा", "अॅ", "ाै", "ैा", "ंृ", "ँा", "ँू", "ेा", "ंे", "ाें", "ॅं", "ंॅ", " ः", "ंू", "ेे"]
_A2 = ["ईं", "µ", "µ", "s", "R", "=", "âg", "âgb", "âb", "âs", "ât", "s&", "eâ&", "eâ@", "eâW", "क्त", "ीं", "ऑ", "ें&", "े&", "ैं&", "ै&", "ीं&", "ी&", "ं&", "&ि", "िं", "िं", "िं", "क्र", "के", "कृ", "कु", "क़", "फ़", "ज़", "ख़", "य़", "ग़", "फ", "फ", "फ्", "फ्", "क़्", "ख़्", "ॐ", "।", "ऋ", "्रू", "्रु", "स्त्र", "स्त्र्", "स्र", "स्र्", "रु", "रू", "रू", "ष्ट्य", "ट्ट्य", "ट्य", "ठ्य", "ड्य", "ढ्य", "श्र्", "त्र्", "ग्र्", "व्र्", "ज्र्", "ह्न", "प्र्", "ह्र", "झ्र्", "प्र्", "द्र", "क्ष्", "ज्ञ्", "न्न्", "ष्ट", "ष्ठ", "ष्ठ", "ङ्घ", "ङ्ख", "ङ्ग", "ह्य्", "ह्व", "ह्ल", "द्म्", "ट्ठ", "श्च्", "ष्ट", "ड्ढ", "ङ्क", "ञ्ज्", "ङ्ग", "दृ", "ञ्च्", "व्न्", "द्य्", "द्भ", "ङ्ख", "द्व", "ढ्ढ", "श्व्", "द्ध", "ड्ड", "त्त्", "ट्ट", "द्ब", "द्द", "हृ", "ठ्ठ", "द्ग", "ह्म्", "ड़", "ढ़", "्न", "्य्", "्र", "्र", "्र", "्ल", "अ", "ई", "इ", "उ", "ऌ", "ए", "ऊ", "क्", "क", "ख्र्", "ख्", "ग्", "घ्", "ङ", "च्", "छ", "ज्", "झ्", "ञ्", "ट", "ठ", "ड", "ढ", "ण्", "त्", "थ्", "द", "ध्", "न्", "प्", "प्", "ब्", "भ्", "म्", "य्", "र", "ल्", "ल", "ळ्", "व्", "व्", "ळ", "श्", "श्", "श्", "ष्", "स्", "ह्", "ह", "र्‍", "ी", "ा", "ा", "ा", "ा", "ा", "ा", "ा", "ा", "ा", "ा", "ु", "ु", "ू", "ू", "ृ", "ॢ", "े", "ै", "ं", "ँ", "ः", "्", "़", "़", "ॅ", "ऽ", "॰", "ैं", "ें", "०", "१", "२", "३", "४", "५", "६", "७", "८", "९", "", "े", "ै", "ओ", "आ", "औ", "ओ", "ो", "ॉ", "ॉ", "ो", "ऐ", "ुं", "े", "अ‍ै", "ो", "अ‍े", "ां", "अ‍ॅ", "ौ", "ौ", "ृं", "ाँ", "ूँ", "ो", "ें", "ों", "ँ", "ँ", " :", "ूं", "े"]

SET_OF_MATRAS = set("ा ि ी ु ू ृ े ै ो ौ ं : ँ ॅ".split())

def convert_aps_to_unicode(text: str) -> str:
    """Converts APS-DV legacy encoded Hindi string to Unicode Devanagari."""
    if not text:
        return ""
    
    modified = text
    
    # Step 1: Sequential symbol replacements
    for s1, s2 in zip(_A1, _A2):
        if s1 and s1 in modified:
            modified = modified.replace(s1, s2)
            
    # Step 2: Handle short i matra ('µ') which appears before consonant
    pos_i = modified.find("µ")
    while pos_i != -1:
        if pos_i + 1 < len(modified):
            next_char = modified[pos_i + 1]
            to_replace = "µ" + next_char
            modified = modified.replace(to_replace, next_char + "ि", 1)
        else:
            modified = modified.replace("µ", "ि", 1)
        pos_i = modified.find("µ", pos_i + 1)
        
    # Step 3: Handle 'ि्' -> '्' + next + 'ि'
    pos_wrong = modified.find("ि्")
    while pos_wrong != -1:
        if pos_wrong + 2 < len(modified):
            next_cons = modified[pos_wrong + 2]
            to_replace = "ि्" + next_cons
            modified = modified.replace(to_replace, "्" + next_cons + "ि", 1)
        pos_wrong = modified.find("ि्", pos_wrong + 2)
        
    # Step 4: Handle 'िं्' -> '्' + next + 'िं'
    pos_wrong2 = modified.find("िं्")
    while pos_wrong2 != -1:
        if pos_wrong2 + 3 < len(modified):
            next_cons = modified[pos_wrong2 + 3]
            to_replace = "िं्" + next_cons
            modified = modified.replace(to_replace, "्" + next_cons + "िं", 1)
        pos_wrong2 = modified.find("िं्", pos_wrong2 + 3)
        
    # Step 5: Handle reph '&' (half 'r' placed above consonant/matra)
    pos_R = modified.find("&")
    while pos_R > 0:
        prob_pos = pos_R - 1
        char_at = modified[prob_pos]
        while prob_pos >= 0 and char_at in SET_OF_MATRAS:
            prob_pos -= 1
            if prob_pos >= 0:
                char_at = modified[prob_pos]
            else:
                break
                
        prev_pos = prob_pos - 1
        if prev_pos > 0 and modified[prev_pos] == "्":
            while prev_pos >= 0 and modified[prev_pos] == "्":
                prob_pos = prev_pos - 1
                prev_pos = prob_pos - 1
                
        prob_pos = max(0, prob_pos)
        to_replace = modified[prob_pos:pos_R]
        new_str = "र्" + to_replace
        modified = modified[:prob_pos] + new_str + modified[pos_R + 1:]
        pos_R = modified.find("&")
        
    # Clean up minor artifacts
    modified = modified.replace("~", "।")
    return modified

if __name__ == "__main__":
    t = "ʻefØeÙe ØeJeemeʼ ceW efkeâme jme keâer ØeOeevelee nw?"
    print("Converted:", convert_aps_to_unicode(t))
