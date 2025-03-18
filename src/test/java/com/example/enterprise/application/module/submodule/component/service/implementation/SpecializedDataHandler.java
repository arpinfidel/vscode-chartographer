package com.example.enterprise.application.module.submodule.component.service.implementation;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

public class SpecializedDataHandler<T extends Comparable<T> & AutoCloseable, R extends Number & Comparable<R>> {
    private final Map<Class<?>, Function<T, R>> typeProcessors = new HashMap<>();
    private final List<DataTransformer<T, R>> transformers = new ArrayList<>();

    public interface DataTransformer<I extends AutoCloseable, O extends Number> {
        O transform(I input) throws Exception;
        default CompletableFuture<O> transformAsync(I input) {
            return CompletableFuture.supplyAsync(() -> {
                try {
                    return transform(input);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
        }
    }

    public <V extends T, U extends R> void registerProcessor(
            Class<V> type,
            Function<V, U> processor) {
        typeProcessors.put(type, (Function<T, R>) processor);
    }

    public <S extends Collection<? extends T>> Map<Class<?>, List<R>> processData(S data) {
        return data.stream()
            .collect(Collectors.groupingBy(
                Object::getClass,
                Collectors.mapping(
                    this::processElement,
                    Collectors.toList()
                )
            ));
    }

    private R processElement(T element) {
        return typeProcessors.getOrDefault(
            element.getClass(),
            e -> { throw new UnsupportedOperationException("No processor for type: " + e.getClass()); }
        ).apply(element);
    }

    public <X extends Comparable<X> & AutoCloseable> CompletableFuture<List<Map<X, R>>>
            processWithNestedStructure(
                List<T> data,
                Function<T, X> keyExtractor,
                Function<T, R> valueExtractor) {

        return CompletableFuture.supplyAsync(() ->
            data.stream()
                .map(element -> Map.of(
                    keyExtractor.apply(element),
                    valueExtractor.apply(element)
                ))
                .collect(Collectors.toList())
        );
    }

    public static class ChainedProcessor<S extends AutoCloseable & Comparable<S>, U extends Number & Comparable<U>> {
        private final List<Function<S, U>> processingChain = new ArrayList<>();

        public ChainedProcessor<S, U> addProcessor(Function<S, U> processor) {
            processingChain.add(processor);
            return this;
        }

        public Function<S, List<U>> buildProcessor() {
            return input -> processingChain.stream()
                .map(processor -> processor.apply(input))
                .collect(Collectors.toList());
        }

        public <V extends Collection<? extends S>> Map<S, List<U>> processAll(V inputs) {
            Function<S, List<U>> processor = buildProcessor();
            return inputs.stream()
                .collect(Collectors.toMap(
                    s -> s,
                    processor,
                    (a, b) -> a
                ));
        }
    }

    protected class AsyncDataProcessor<I extends T, O extends R> {
        private final Function<I, O> processor;
        private final int batchSize;

        public AsyncDataProcessor(Function<I, O> processor, int batchSize) {
            this.processor = processor;
            this.batchSize = batchSize;
        }

        public CompletableFuture<List<O>> processBatch(List<I> inputs) {
            return CompletableFuture.supplyAsync(() ->
                inputs.stream()
                    .map(processor)
                    .collect(Collectors.toList())
            );
        }

        public CompletableFuture<Map<I, O>> processWithMapping(List<I> inputs) {
            return CompletableFuture.supplyAsync(() ->
                inputs.stream()
                    .collect(Collectors.toMap(
                        i -> i,
                        processor
                    ))
            );
        }
    }
}