package com.satir.reading.api;

import org.springframework.web.bind.annotation.*;
import com.satir.reading.application.DictionaryService;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/dictionary")
class DictionaryController {
    private final DictionaryService dictionary;
    DictionaryController(DictionaryService dictionary){this.dictionary=dictionary;}
    @GetMapping
    DictionaryService.Entry find(@RequestParam String word,HttpServletRequest request){return dictionary.find(word,request.getRemoteAddr());}
}
