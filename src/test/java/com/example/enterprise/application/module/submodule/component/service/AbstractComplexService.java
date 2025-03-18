package com.example.enterprise.application.module.submodule.component.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

public abstract class AbstractComplexService<T extends Comparable<T>, R extends AutoCloseable> implements ComplexService<T, R> {
    protected abstract class DataProcessor<V extends Number> {
        protected abstract V process(T input);
        protected abstract boolean validate(V result);

        public List<V> processAll(List<T> inputs) {
            return inputs.stream()
                .map(this::process)
                .filter(this::validate)
                .collect(Collectors.toList());
        }
    }

    protected class ValidationHandler<E extends Exception> {
        private final List<Function<T, Boolean>> validators;

        public ValidationHandler() {
            this.validators = new ArrayList<>();
        }

        public void addValidator(Function<T, Boolean> validator) {
            validators.add(validator);
        }

        public boolean validate(T input) throws E {
            return validators.stream().allMatch(v -> v.apply(input));
        }
    }

    @Override
    public void processAndTransform(List<T> data) {
        preProcess(data);
        List<T> transformed = transform(data);
        postProcess(transformed);
    }

    protected abstract void preProcess(List<T> data);
    protected abstract List<T> transform(List<T> data);
    protected abstract void postProcess(List<T> data);

    @Override
    public <X extends Number & Comparable<X>, Y extends Comparable<Y>> CompletableFuture<Map<X, List<Y>>>
            processComplexDataStructure(
                List<T> inputData,
                Function<T, X> keyTransformer,
                Function<T, Y> valueTransformer,
                Optional<R> context) {
        return CompletableFuture.supplyAsync(() -> {
            validateInputData(inputData);
            return processDataWithTransformers(inputData, keyTransformer, valueTransformer);
        });
    }

    protected abstract void validateInputData(List<T> data);

    protected abstract <X extends Number & Comparable<X>, Y extends Comparable<Y>> Map<X, List<Y>>
            processDataWithTransformers(
                List<T> inputData,
                Function<T, X> keyTransformer,
                Function<T, Y> valueTransformer);

    protected class TransformationChain<S> {
        private final List<Function<S, S>> transformers;

        public TransformationChain() {
            this.transformers = new ArrayList<>();
        }

        public void addTransformer(Function<S, S> transformer) {
            transformers.add(transformer);
        }

        public S applyTransformations(S input) {
            return transformers.stream()
                .reduce(Function.identity(), Function::andThen)
                .apply(input);
        }
    }

    protected abstract class AsyncProcessor<I, O> {
        protected abstract CompletableFuture<O> processAsync(I input);
        protected abstract void handleError(Throwable error);

        public CompletableFuture<List<O>> processAllAsync(List<I> inputs) {
            List<CompletableFuture<O>> futures = inputs.stream()
                .map(this::processAsync)
                .collect(Collectors.toList());

            return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream()
                    .map(CompletableFuture::join)
                    .collect(Collectors.toList()))
                .exceptionally(error -> {
                    handleError(error);
                    return new ArrayList<>();
                });
        }
    }
}