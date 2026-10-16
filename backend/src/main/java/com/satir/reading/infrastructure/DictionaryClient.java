package com.satir.reading.infrastructure;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.http.*;
import java.time.Duration;
import java.io.IOException;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Only the explicitly selected word reaches fixed HTTPS dictionary hosts; no notes or article text. */
@Component
public class DictionaryClient {
    public record Entry(String word,String definition,String example,String phonetic,String source) { }
    private final JsonMapper json;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
    DictionaryClient(JsonMapper json){this.json=json;}
    public Optional<Entry> find(String word){
        String encoded=URLEncoder.encode(word,StandardCharsets.UTF_8).replace("+","%20");
        try {
            var entry=get("https://api.dictionaryapi.dev/api/v2/entries/en/"+encoded).path(0);
            var definition=entry.path("meanings").path(0).path("definitions").path(0);
            String meaning=definition.path("definition").asString("");
            if(!meaning.isBlank())return Optional.of(new Entry(word,meaning,definition.path("example").asString(""),entry.path("phonetic").asString(""),"https://en.wiktionary.org/wiki/"+encoded));
        } catch(IllegalStateException ignored) { /* The independent public source below can still answer. */ }
        var entries=get("https://en.wiktionary.org/api/rest_v1/page/definition/"+encoded).path("en");
        return fromWiktionary(word,entries,"https://en.wiktionary.org/wiki/"+encoded);
    }
    public static Optional<Entry> fromWiktionary(String word,JsonNode entries,String source) {
        java.util.List<String> meanings=new java.util.ArrayList<>();String example="";
        for(var group:entries){
            var definition=group.path("definitions").path(0);String text=plain(definition.path("definition").asString(""));
            if(!text.isBlank())meanings.add(group.path("partOfSpeech").asString("")+": "+text);
            if(example.isBlank())example=plain(definition.path("examples").path(0).asString(""));
            if(meanings.size()==3)break;
        }
        return meanings.isEmpty()?Optional.empty():Optional.of(new Entry(word,String.join("\n\n",meanings),example,"",source));
    }
    private static String plain(String html){return HtmlUtils.htmlUnescape(html.replaceAll("<[^>]*>","")).replaceAll("\\s+"," ").strip();}
    private JsonNode get(String url){
        try{
            var response=http.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(4))
                .header("Accept","application/json").header("User-Agent","SATIR/1.0 (https://github.com/mrbyte66/mrbyte-blogger-v2)").GET().build(),
                info -> HttpResponse.BodySubscribers.limiting(HttpResponse.BodySubscribers.ofByteArray(),100000));
            if(response.statusCode()==404)return json.createObjectNode();
            if(response.statusCode()!=200)throw new IllegalStateException("Dictionary unavailable");
            return json.readTree(response.body());
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException("Dictionary interrupted",e);}
        catch(IOException e){throw new IllegalStateException("Dictionary unavailable",e);}
    }
}
