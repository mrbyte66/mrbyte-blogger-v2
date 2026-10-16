package com.satir.reading.application;

import java.time.Clock;
import java.time.Instant;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import com.satir.reading.infrastructure.DictionaryClient;
import com.satir.platform.api.ApiException;
import com.satir.platform.validation.ValidationException;
import com.satir.platform.ratelimit.RateLimiter;

@Service
public class DictionaryService {
    public record Entry(String word,String definition,String example,String phonetic,String source,String language) { }
    private record Cached(Entry entry,Instant until) { }
    private final DictionaryClient client;private final Clock clock;private final RateLimiter limiter;
    private final LinkedHashMap<String,Cached> cache=new LinkedHashMap<>();
    DictionaryService(DictionaryClient client,Clock clock,RateLimiter limiter){this.client=client;this.clock=clock;this.limiter=limiter;}
    public Entry find(String raw,String ip){
        String word=raw==null?"":raw.strip().toLowerCase(Locale.ROOT);
        if(!word.matches("[a-zA-Z][a-zA-Z' -]{0,59}"))throw new ValidationException("word","FORMAT");
        synchronized(cache){var item=cache.get(word);if(item!=null&&item.until().isAfter(clock.instant()))return item.entry();}
        var limit=new RateLimiter.Limit("dictionary",30,Duration.ofMinutes(1));
        if(limiter.blockedFor(limit,ip).isPresent())throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"DICTIONARY_RATE_LIMIT","Biraz bekleyip tekrar dene");
        limiter.record(limit,ip);
        DictionaryClient.Entry entry;
        try{entry=client.find(word).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"WORD_NOT_FOUND","Bu kelime sözlükte bulunamadı"));}
        catch(IllegalStateException e){throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"DICTIONARY_UNAVAILABLE","Sözlüğe şu anda ulaşılamıyor; tekrar deneyebilirsin");}
        var result=new Entry(entry.word(),entry.definition(),entry.example(),entry.phonetic(),entry.source(),"en");
        synchronized(cache){if(cache.size()>=500)cache.remove(cache.keySet().iterator().next());cache.put(word,new Cached(result,clock.instant().plus(Duration.ofHours(6))));}
        return result;
    }
}
